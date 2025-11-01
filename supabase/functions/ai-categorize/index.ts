import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPENSE_CATEGORIES = [
  'food', 'transportation', 'entertainment', 'shopping', 'utilities',
  'rent', 'healthcare', 'education', 'travel', 'other'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, amount } = await req.json();
    
    if (!description) {
      throw new Error('Description is required');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable API key not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expense categorization assistant. Given an expense description and amount, categorize it into one of these categories: ${EXPENSE_CATEGORIES.join(', ')}.

            Respond with only the category name, nothing else. Examples:
            - "Grocery store" -> food
            - "Gas station" -> transportation  
            - "Movie tickets" -> entertainment
            - "Electric bill" -> utilities
            - "Apartment rent" -> rent`
          },
          {
            role: 'user',
            content: `Description: "${description}"${amount ? `, Amount: ₹${amount}` : ''}`
          }
        ],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable workspace.');
      }
      throw new Error(`AI API error: ${errorText}`);
    }

    const data = await response.json();
    const category = data.choices[0].message.content.trim().toLowerCase();
    
    // Validate category
    const validCategory = EXPENSE_CATEGORIES.includes(category) ? category : 'other';

    console.log(`Categorized "${description}" as "${validCategory}"`);

    return new Response(JSON.stringify({ 
      category: validCategory,
      confidence: category === validCategory ? 'high' : 'low'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-categorize function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      category: 'other' // fallback
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
