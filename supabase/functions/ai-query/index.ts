import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { query } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

    // Get user's groups first
    const { data: userGroups } = await supabase
      .from('group_members')
      .select('group_id, groups(name)')
      .eq('user_id', user.id);

    if (!userGroups?.length) {
      return new Response(JSON.stringify({ 
        answer: "You don't have any expense groups yet. Create a group to start tracking expenses!",
        data: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groupIds = userGroups.map(g => g.group_id);

    // Get all expenses for the user's groups
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, category, expense_date, paid_by, group_id, description')
      .in('group_id', groupIds)
      .order('expense_date', { ascending: false })
      .limit(1000); // Reasonable limit

    if (error) throw error;

    // Get member profiles
    const memberIds = [...new Set(expenses?.map(e => e.paid_by) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', memberIds);

    const memberMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.email]) || []);
    const groupMap = new Map(userGroups.map(g => [g.group_id, g.groups?.name]) || []);

    // Process expenses for AI analysis
    const processedExpenses = expenses?.map(e => ({
      amount: Number(e.amount),
      category: e.category,
      date: e.expense_date,
      paidBy: memberMap.get(e.paid_by) || 'Unknown',
      group: groupMap.get(e.group_id) || 'Unknown',
      description: e.description
    })) || [];

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create summary statistics for context
    const totalAmount = processedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const categories = [...new Set(processedExpenses.map(e => e.category))];
    const members = [...new Set(processedExpenses.map(e => e.paidBy))];
    const groups = [...new Set(processedExpenses.map(e => e.group))];
    
    const categoryTotals = processedExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const memberTotals = processedExpenses.reduce((acc, e) => {
      acc[e.paidBy] = (acc[e.paidBy] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    // Use AI to interpret the query and generate response
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a financial assistant analyzing expense data. Answer user questions about their expenses with specific numbers and insights.

            Available data context:
            - Total expenses: $${totalAmount.toFixed(2)} across ${processedExpenses.length} transactions
            - Categories: ${categories.join(', ')}
            - Members: ${members.join(', ')}  
            - Groups: ${groups.join(', ')}
            - Date range: ${processedExpenses.length > 0 ? `${processedExpenses[processedExpenses.length - 1].date} to ${processedExpenses[0].date}` : 'No data'}

            Category totals: ${Object.entries(categoryTotals).map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`).join(', ')}
            Member totals: ${Object.entries(memberTotals).map(([member, amount]) => `${member}: $${amount.toFixed(2)}`).join(', ')}

            Answer questions naturally and include specific dollar amounts and percentages when relevant. If the query asks for something not available in the data, explain what data is available instead.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const aiData = await response.json();
    const answer = aiData.choices[0].message.content;

    // Extract relevant data based on common query patterns
    let relevantData = null;
    const queryLower = query.toLowerCase();

    if (queryLower.includes('travel') || queryLower.includes('trip')) {
      relevantData = processedExpenses
        .filter(e => e.category === 'travel')
        .slice(0, 10);
    } else if (queryLower.includes('food')) {
      relevantData = processedExpenses
        .filter(e => e.category === 'food')
        .slice(0, 10);
    } else if (queryLower.includes('category')) {
      relevantData = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: ((amount / totalAmount) * 100).toFixed(1)
        }))
        .sort((a, b) => b.amount - a.amount);
    } else if (queryLower.includes('member') || queryLower.includes('who')) {
      relevantData = Object.entries(memberTotals)
        .map(([member, amount]) => ({
          member,
          amount,
          percentage: ((amount / totalAmount) * 100).toFixed(1)
        }))
        .sort((a, b) => b.amount - a.amount);
    }

    console.log(`Processed query: "${query}" -> Generated answer with ${relevantData ? 'relevant data' : 'no specific data'}`);

    return new Response(JSON.stringify({ 
      answer,
      data: relevantData,
      summary: {
        totalExpenses: processedExpenses.length,
        totalAmount: totalAmount.toFixed(2),
        categories: categories.length,
        members: members.length,
        groups: groups.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-query function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      answer: "I'm sorry, I couldn't process your query right now. Please try again.",
      data: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});