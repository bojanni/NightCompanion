import { useState, useEffect } from 'react';
import { db } from '../lib/api';

export interface UserProfile {
  id: string;
  user_id: string;
  credit_balance: number;
  total_credits_earned: number;
  total_credits_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earned' | 'spent' | 'purchase' | 'bonus';
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useCredits(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            credit_balance: 1000,
            total_credits_earned: 1000,
            total_credits_spent: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function spendCredits(
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    if (!profile || profile.credit_balance < amount) {
      return false;
    }

    try {
      const newBalance = profile.credit_balance - amount;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          credit_balance: newBalance,
          total_credits_spent: profile.total_credits_spent + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await db.from('credit_transactions').insert({
        user_id: userId,
        amount: -amount,
        transaction_type: 'spent',
        description,
        metadata: metadata || {},
      });

      setProfile({
        ...profile,
        credit_balance: newBalance,
        total_credits_spent: profile.total_credits_spent + amount,
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spend credits');
      return false;
    }
  }

  async function addCredits(
    amount: number,
    type: 'earned' | 'purchase' | 'bonus',
    description: string
  ): Promise<boolean> {
    if (!profile) return false;

    try {
      const newBalance = profile.credit_balance + amount;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          credit_balance: newBalance,
          total_credits_earned: profile.total_credits_earned + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await db.from('credit_transactions').insert({
        user_id: userId,
        amount,
        transaction_type: type,
        description,
        metadata: {},
      });

      setProfile({
        ...profile,
        credit_balance: newBalance,
        total_credits_earned: profile.total_credits_earned + amount,
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add credits');
      return false;
    }
  }

  return {
    profile,
    loading,
    error,
    creditBalance: profile?.credit_balance ?? 0,
    spendCredits,
    addCredits,
    refreshProfile: loadProfile,
  };
}
