import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string || '';

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    if (!supabase) {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabase;
}

export interface ScoreEntry {
    id?: number;
    player_name: string;
    score: number;
    mode: string;
    duration_secs?: number;
    created_at?: string;
}

export async function submitScore(
    playerName: string,
    score: number,
    mode: string,
    durationSecs: number,
): Promise<boolean> {
    const client = getClient();
    if (!client) return false;

    const { error } = await client
        .from('vctpng_scores')
        .insert([{
            player_name: playerName,
            score,
            mode,
            duration_secs: durationSecs,
        }]);

    if (error) {
        console.error('Error submitting score:', error);
        return false;
    }
    return true;
}

export async function getLeaderboard(
    mode: string,
    limit: number = 20,
): Promise<ScoreEntry[]> {
    const client = getClient();
    if (!client) return [];

    const { data, error } = await client
        .from('vctpng_scores')
        .select('player_name, score, mode, duration_secs, created_at')
        .eq('mode', mode)
        .order('score', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }

    return data || [];
}

export function isSupabaseConfigured(): boolean {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}
