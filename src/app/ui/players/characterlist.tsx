"use client";
import {api} from "~/trpc/react";
import Link from "next/link";
import LabeledArrayCodeBlock from "~/app/ui/misc/codeblock";

export function CharacterList() {
  const {data: players, isLoading, isError, error} = api.character.getCharacters.useQuery();

  return (
    <div>
      {isLoading && (
        <div className="flex w-full items-center justify-center">
          <p>Loading...</p>
        </div>
      )}

      {isError && (
        <div className="w-full text-center text-red-500">
          Error: {error.message}
        </div>
      )}

      {players && (
        <div>
          <table className="min-w-full table-auto border-collapse rounded-lg border border-gray-300 shadow-sm">
            <thead>
              <tr className="bg-gray-100 text-sm uppercase leading-normal text-gray-600">
                <th className="border-b border-gray-200 px-6 py-3 text-left">
                  Name
                </th>
                <th className="border-b border-gray-200 px-6 py-3 text-left">
                  server
                </th>
                <th className="border-b border-gray-200 px-6 py-3 text-left">
                  Slug
                </th>
                <th className="border-b border-gray-200 px-6 py-3 text-left">
                  Character ID
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr
                  key={player.characterId}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-3 text-gray-800">
                    <Link
                      href={`/players/${player.characterId}`}
                      className="inline-block rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    >
                      {player.name}
                    </Link>
                  </td>

                  <td className="px-6 py-3 text-gray-800">
                    {player.server}
                  </td>
                  <td className="px-6 py-3 text-gray-800">
                    {player.slug}
                  </td>
                  <td className="px-6 py-3 text-gray-800">
                    {player.characterId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-8">
            <LabeledArrayCodeBlock label="Players" value={players} />
          </div>
        </div>
      )}
    </div>
  );
}
