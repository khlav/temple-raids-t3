"use client";
import { api } from "~/trpc/react";
import { CharactersTable } from "~/components/characters/characters-table";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import type {RaidParticipantCollection} from "~/server/api/interfaces/raid";
import {AllCharactersTableSkeleton} from "~/components/characters/skeletons";
import type {Session} from "next-auth";

export function AllCharacters({session} : {session?: Session}) {
  const { data: players, isSuccess } = api.character.getCharacters.useQuery();
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Function to normalize text (remove non-ASCII characters and convert to lowercase)
  const normalizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters
      .toLowerCase(); // Convert to lowercase
  };

  // Filter characters based on search term
  const filteredPlayers = (
    players
      ? Object.values(players).filter((player) => {
          return Object.values(player).some((value) => {
            // Normalize and check if any field contains the search term
            return normalizeText(String(value)).includes(
              normalizeText(searchTerm),
            );
          });
        })
      : []
  ).reduce((acc, rel) => {
    acc[rel.characterId] = rel;
    return acc;
  }, {} as RaidParticipantCollection);

  return (
    <>
      {isSuccess ? (
        <div>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <CharactersTable characters={filteredPlayers} session={session} />
        </div>
      ) : <AllCharactersTableSkeleton rows={14}/>}
    </>
  );
}
