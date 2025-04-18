import {CharacterDetail} from "~/components/characters/character-detail";
import {auth} from "~/server/auth";

export default async function PlayerPage({ params }: {params: Promise<{characterId: number}>}) {
  const p = await params;
  const session = await auth();
  const characterId = parseInt(String(p.characterId));
  return (
    <div className="w-full px-4">
      {characterId && (
        <>
          <CharacterDetail
            characterId={characterId}

            showEditButton={session?.user?.isRaidManager}
            showRecipeEdit={!!session?.user}
          />
        </>
      )}
    </div>
  );
}
