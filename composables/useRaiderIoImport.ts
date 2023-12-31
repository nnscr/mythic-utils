import { dungeons } from "~/utils/dungeons";
import type { WeeklyAffix } from "~/utils/times";
import type { CharacterInfo } from "./usePlayerData";

export const useRaiderIoImport = defineStore("raiderIoImport", () => {
    const loading = ref(false);
    const error = ref(false);

    function dismissError() {
        if (error.value) {
            loading.value = false;
            error.value = false;
        }
    }

    async function importCharacter(region: string, realm: string, character: string, force: boolean = false) {
        const characterHistory = useCharacterHistory();

        loading.value = true;
        try {
            const data = await runImport(region, realm, character, force);

            characterHistory.save(data.characterInfo);

            applyImport(data.timings, data.characterInfo);
            checkScores(data.timings);
            // await new Promise((r) => setTimeout(r, 2000));
            // throw new Error("Failed to load character");
        } catch {
            error.value = true;
            return;
        }
        loading.value = false;
    }

    async function runImport(region: string, realm: string, character: string, force: boolean = false) {
        const res = await fetch(
            `https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${character}&fields=mythic_plus_best_runs,mythic_plus_alternate_runs,guild`,
            force ? { cache: "reload" } : {}
        );
        const data = await res.json();
        const allRuns = [...data.mythic_plus_best_runs, ...data.mythic_plus_alternate_runs];

        const timings = createEmptyDungeonTimingObject();

        allRuns.forEach((run) => {
            const week = getWeekFromAffixesList(run.affixes);
            const dungeon = run.short_name as DUNGEON_SHORTS;

            if (timings[dungeon][week].score < run.score) {
                timings[dungeon][week] = {
                    level: run.mythic_level,
                    plus: run.num_keystone_upgrades,
                    duration: run.clear_time_ms,
                    score: run.score,
                };
            }

            const actualTimer = run.par_time_ms;

            if (run.par_time_ms != dungeons[dungeon].plus1) {
                console.warn(
                    "Timer mismatch: " +
                        dungeon +
                        " " +
                        week +
                        ", expected " +
                        dungeons[dungeon].plus1 +
                        " got " +
                        actualTimer
                );
            }
        });

        const characterInfo: CharacterInfo = {
            region: data.region,
            realm: data.realm,
            name: data.name,
            class: data.class as CharacterClasses,
            spec: data.active_spec_name,
            thumbnailUrl: data.thumbnail_url,
            guildName: data.guild?.name,
        };

        return { timings, characterInfo };
    }

    function applyImport(newDungeonData: Record<DUNGEON_SHORTS, OverallDungeonTime>, characterInfo: CharacterInfo) {
        const playerData = usePlayerData();

        for (const [dungeon, timings] of Object.entries(newDungeonData)) {
            for (const [week, timing] of Object.entries(timings)) {
                playerData.originalTimes[dungeon as DUNGEON_SHORTS][week as WeeklyAffix] = {
                    level: timing.level,
                    plus: timing.plus,
                    duration: timing.duration,
                };

                playerData.hypotheticalTimes[dungeon as DUNGEON_SHORTS][week as WeeklyAffix] = {
                    level: timing.level,
                    plus: timing.plus,
                    duration: timing.duration,
                };

                playerData.setCharacterInfo(characterInfo);
            }
        }
    }

    function checkScores(newDungeonData: Record<DUNGEON_SHORTS, OverallDungeonTimeWithScore>) {
        const playerData = usePlayerData();

        // check if calculated player scores matches the ones from raider.io
        for (const [dungeon, timings] of Object.entries(newDungeonData)) {
            const fortified = playerData.originalScores[dungeon as DUNGEON_SHORTS].baseScore.Fortified;
            const tyrannical = playerData.originalScores[dungeon as DUNGEON_SHORTS].baseScore.Tyrannical;

            const expectedFortified = newDungeonData[dungeon as DUNGEON_SHORTS].Fortified.score;
            const expectedTyrannical = newDungeonData[dungeon as DUNGEON_SHORTS].Tyrannical.score;

            if (!fortified.equals(expectedFortified)) {
                // if (fortified != expectedFortified) {
                console.warn(
                    "Score mismatch: " +
                        dungeon +
                        " Fortified, raiderIO " +
                        expectedFortified +
                        " calculated " +
                        fortified
                );
            }

            if (!tyrannical.equals(expectedTyrannical)) {
                // if (tyrannical != expectedTyrannical) {
                console.warn(
                    "Score mismatch: " +
                        dungeon +
                        " Tyrannical, raiderIO " +
                        expectedTyrannical +
                        " calculated " +
                        tyrannical
                );
            }
        }

        return false;
    }

    return { importCharacter, runImport, applyImport, checkScores, dismissError, loading, error };
});

function getWeekFromAffixesList(affixes: { id: number }[]): WeeklyAffix {
    if (affixes.find((affix) => affix.id === 9)) {
        return "Tyrannical";
    }

    if (affixes.find((affix) => affix.id === 10)) {
        return "Fortified";
    }

    return "Fortified";
}

type OverallDungeonTimeWithScore = OverallDungeonTime & {
    Tyrannical: { score: number };
    Fortified: { score: number };
};

function createEmptyDungeonTimingObject(): Record<DUNGEON_SHORTS, OverallDungeonTimeWithScore> {
    return Object.fromEntries(
        Object.keys(dungeons).map((dungeonShort) => [
            dungeonShort as DUNGEON_SHORTS,
            {
                Tyrannical: { level: 0, plus: 0, duration: 0, score: 0 },
                Fortified: { level: 0, plus: 0, duration: 0, score: 0 },
            },
        ])
    ) as any as Record<DUNGEON_SHORTS, OverallDungeonTimeWithScore>;
}
