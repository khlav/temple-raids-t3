"use client";

import { api } from "~/trpc/react";
import LabeledArrayCodeBlock from "~/components/misc/codeblock";

export function CharacterDetail({characterId}: {characterId: number}) {
  const { data: character, isLoading, isError, error } = api.character.getCharacterById.useQuery(characterId);

  return (
    <div>
      {isLoading && (
        <div className="w-full flex justify-center items-center">
          <p>Loading...</p>
        </div>
      )}

      {isError && (
        <div className="w-full text-center text-red-500">
          Error: {error.message}
        </div>
      )}

      {character && (
        <div>
          <LabeledArrayCodeBlock label="Character" value={JSON.stringify(character, null, 2)}/>
        </div>
      )}
    </div>
  )
    ;
}

export function CharacterRaids({characterId}: {characterId: number}) {
  const { data: raidsAttended, isLoading, isError, error } = api.character.getRaidsForCharacterId.useQuery(characterId);

  return (
    <div>
      {isLoading && (
        <div className="w-full flex justify-center items-center">
          <p>Loading...</p>
        </div>
      )}

      {isError && (
        <div className="w-full text-center text-red-500">
          Error: {error.message}
        </div>
      )}

      {raidsAttended && (
        <div>
          <LabeledArrayCodeBlock label="Raids Attended" value={JSON.stringify(raidsAttended, null, 2)}/>
        </div>
      )}
    </div>
  )
    ;
}