import { Redirect } from 'expo-router';
import React from 'react';
import { useEffect } from 'react'

import { useSupabase } from '@/src/context/SupabaseContext';


export default function Index() {
  const { supabase } = useSupabase();

  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase.from('test').select('*')
      if (error) {
        console.log('❌ Erreur:', error.message)
      } else {
        console.log('✅ Connexion réussie:', data)
      }
    }
    testConnection()
  }, [supabase])

  return <Redirect href="/test" />
}
