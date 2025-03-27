"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import Link from "next/link";
import { WOWHeadTooltips } from "~/components/misc/wowhead-tooltips";
import { CheckCircle2, Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { ConstructionBanner } from "~/components/misc/construction-banner";

const SAMPLE_SEARCHES = [
  "#natureresist Tailoring",
  "#caster Bloodvine",
  "#tank #melee Enchanting",
  "Glacial #healer",
  "#ranged Engineering",
  "#shield Biznicks",
  "Runed Stygian #aq40",
  "#qol Bottomless",
  "Brilliant Oil #caster",
  "#chest #naxx "
];

export const RecipesWithCrafters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('s') ?? '';
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: recipes, isLoading, isSuccess } = api.recipe.getAllRecipesWithCharacters.useQuery();
  const WOWHEAD_SPELL_URL_BASE = "https://www.wowhead.com/classic/spell=";

  const [searchTerms, setSearchTerms] = useState<string>(initialSearch);
  const [placeholderSearch, setPlaceholderSearch] = useState<string>('');

  useEffect(() => {
    setPlaceholderSearch(SAMPLE_SEARCHES[Math.floor(Math.random() * SAMPLE_SEARCHES.length)] ?? '');
  }, [searchTerms]);

  // Focus search input on component mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Update URL when search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString());

    if (searchTerms) {
      params.set('s', searchTerms);
    } else {
      params.delete('s');
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchTerms, router, searchParams]);

  // Filter function for recipes
  const filteredRecipes = recipes?.filter(recipe => {
    if (!searchTerms.trim()) return true;

    // Split search terms and convert to lowercase
    const terms = searchTerms.toLowerCase().split(/\s+/);

    // Convert recipe details to searchable string
    const searchableString = [
      recipe.recipe.toLowerCase(),
      recipe.profession.toLowerCase(),
      recipe.isCommon ? 'common' : '',
      recipe.tags?.map((tag) => "#"+tag).join(' ').toLowerCase() ?? '',
      recipe.characters?.map(c => c.name?.toLowerCase()).join(' ') || ''
    ].join(' ');

    // Check if ALL terms are present in the searchable string
    return terms.every(term => searchableString.includes(term));
  }) ?? [];

  return (
    <div className="w-full space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={
            placeholderSearch
              ? `Search recipes, professions, tags, or characters... (e.g. ${placeholderSearch})`
              : "Search recipes, professions, tags, or characters..."
          }
          className="pl-10 w-full"
          value={searchTerms}
          onChange={(e) => setSearchTerms(e.target.value ?? '')}
        />
      </div>
      {/* Under Construction Banner */}
      <ConstructionBanner>
        <strong>Work in progress</strong> -- Crafters coming soon.
      </ConstructionBanner>

      {isLoading && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading recipes...</div>
      )}

      {isSuccess && (
        <div className="overflow-x-auto">
          <WOWHeadTooltips />
          <table className="w-full border-collapse text-sm">
            <thead>
            <tr className="bg-secondary">
              <th className="p-3 text-left bg-secondary text-secondary-foreground font-semibold">Recipe</th>
              <th className="p-3 text-left bg-secondary text-secondary-foreground font-semibold">Profession</th>
              <th className="p-3 text-center bg-secondary text-secondary-foreground font-semibold">Is Common?</th>
              <th className="p-3 text-left bg-secondary text-secondary-foreground font-semibold">Tags</th>
              <th className="p-3 text-left bg-secondary text-secondary-foreground font-semibold">Crafters</th>
            </tr>
            </thead>
            <tbody>
            {filteredRecipes.map((recipe) => (
              <tr
                key={recipe.recipeSpellId}
                className="border-b"
              >
                <td className="p-3">
                  <Link
                    href={WOWHEAD_SPELL_URL_BASE + recipe.recipeSpellId}
                    className="hover:underline"
                    target="_blank"
                  >
                    {recipe.recipe}
                  </Link>
                </td>
                <td className="p-3">{recipe.profession}</td>
                <td className="p-3 text-center">
                  {recipe.isCommon && (
                    <CheckCircle2
                      className="text-green-500 dark:text-green-400 mx-auto"
                      size={20}
                    />
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full"
                      >
                          #{tag}
                        </span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {recipe.characters?.map((character) => (
                      <span
                        key={character.characterId}
                        className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full"
                      >
                          {character.name}
                        </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>

          {filteredRecipes.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No recipes found matching your search
            </div>
          )}
        </div>
      )}
    </div>
  )
}