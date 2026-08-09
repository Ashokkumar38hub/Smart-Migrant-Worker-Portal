import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { RECOMMENDED_COURSES, ALL_JOBS } from "@/constants/jobs";

interface SkillInputProps {
    selectedSkills: string[];
    onChange: (skills: string[]) => void;
    placeholder?: string;
}

// Extract all unique skills from constants
const PREDEFINED_SKILLS = Array.from(new Set([
    ...Object.keys(RECOMMENDED_COURSES),
    ...ALL_JOBS.flatMap(job => job.required_skills || [])
])).sort();

const SkillInput: React.FC<SkillInputProps> = ({
    selectedSkills,
    onChange,
    placeholder = "Add skills (e.g. Masonry, Safety)"
}) => {
    const [inputValue, setInputValue] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (inputValue.trim()) {
            const filtered = PREDEFINED_SKILLS.filter(skill =>
                skill.toLowerCase().includes(inputValue.toLowerCase()) &&
                !selectedSkills.includes(skill)
            );
            setSuggestions(filtered.slice(0, 5));
            setShowSuggestions(filtered.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [inputValue, selectedSkills]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const addSkill = (skill: string) => {
        if (!selectedSkills.includes(skill)) {
            onChange([...selectedSkills, skill]);
        }
        setInputValue("");
        setShowSuggestions(false);
    };

    const removeSkill = (skillToRemove: string) => {
        onChange(selectedSkills.filter(s => s !== skillToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault();
            addSkill(inputValue.trim());
        } else if (e.key === "Backspace" && !inputValue && selectedSkills.length > 0) {
            removeSkill(selectedSkills[selectedSkills.length - 1]);
        }
    };

    return (
        <div className="relative space-y-2" ref={containerRef}>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-1.5 border rounded-md bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all border-border">
                {selectedSkills.map(skill => (
                    <Badge key={skill} variant="secondary" className="gap-1 px-2 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                        {skill}
                        <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="hover:text-destructive transition-colors focus:outline-none"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
                <input
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] placeholder:text-muted-foreground py-1"
                    placeholder={selectedSkills.length === 0 ? placeholder : ""}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue.trim() && setShowSuggestions(true)}
                />
            </div>

            {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-1">
                        <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
                            Suggestions
                        </p>
                        {suggestions.map((skill) => (
                            <button
                                key={skill}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary rounded-sm transition-colors flex items-center gap-2"
                                onClick={() => addSkill(skill)}
                            >
                                <Search className="h-3 w-3 text-muted-foreground" />
                                {skill}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SkillInput;
