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

    const { groupId, timeRange = '30d' } = await req.json();

    // Calculate date range
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    let expenseQuery = supabase
      .from('expenses')
      .select('amount, category, expense_date, paid_by, group_id')
      .gte('expense_date', startDate.toISOString().split('T')[0]);

    if (groupId && groupId !== 'all') {
      expenseQuery = expenseQuery.eq('group_id', groupId);
    } else {
      // Get user's groups
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      
      if (userGroups?.length) {
        const groupIds = userGroups.map(g => g.group_id);
        expenseQuery = expenseQuery.in('group_id', groupIds);
      }
    }

    const { data: expenses, error } = await expenseQuery;
    if (error) throw error;

    if (!expenses?.length) {
      return new Response(JSON.stringify({ 
        insights: ["No expenses found for the selected period."] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get member profiles for insights
    const memberIds = [...new Set(expenses.map(e => e.paid_by))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', memberIds);

    const memberMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.email]) || []);

    // Analyze expenses
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const avgAmount = totalAmount / expenses.length;
    
    // Category analysis
    const categoryTotals = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);
    
    const topCategory = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)[0];

    // Member analysis
    const memberTotals = expenses.reduce((acc, e) => {
      acc[e.paid_by] = (acc[e.paid_by] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

    const avgPerMember = totalAmount / Object.keys(memberTotals).length;
    const memberAnalysis = Object.entries(memberTotals).map(([userId, amount]) => ({
      name: memberMap.get(userId) || 'Unknown',
      amount,
      percentage: (amount / totalAmount) * 100
    }));

    // Weekly trend analysis
    const weeklyTotals = expenses.reduce((acc, e) => {
      const week = new Date(e.expense_date).toISOString().split('T')[0].slice(0, 7);
      acc[week] = (acc[week] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

    const weeklyValues = Object.values(weeklyTotals);
    const avgWeekly = weeklyValues.reduce((a, b) => a + b, 0) / weeklyValues.length;
    const lastWeekly = weeklyValues[weeklyValues.length - 1] || 0;
    const weeklyChange = weeklyValues.length > 1 
      ? ((lastWeekly - avgWeekly) / avgWeekly) * 100 
      : 0;

    // Generate insights using AI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ 
        insights: ["AI insights unavailable - API key not configured"] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contextData = {
      totalAmount: totalAmount.toFixed(2),
      expenseCount: expenses.length,
      avgAmount: avgAmount.toFixed(2),
      topCategory: topCategory ? `${topCategory[0]} (₹${topCategory[1].toFixed(2)})` : 'N/A',
      memberAnalysis: memberAnalysis.map(m => `${m.name}: ₹${m.amount.toFixed(2)} (${m.percentage.toFixed(1)}%)`),
      weeklyTrend: weeklyChange > 0 ? `up ${weeklyChange.toFixed(1)}%` : `down ${Math.abs(weeklyChange).toFixed(1)}%`,
      timeRange: `${daysBack} days`
    };

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
            content: `You are a financial analyst providing insights about group expenses. Generate 3-5 actionable insights based on the expense data. Keep insights concise (1-2 sentences each) and focus on trends, patterns, and recommendations.

            Format as a JSON array of strings. Examples:
            - "Your food expenses increased 25% this month compared to your average"
            - "Sarah contributes 40% above the group average - consider rebalancing"
            - "Transportation costs are trending upward - look for carpooling opportunities"`
          },
          {
            role: 'user',
            content: `Analyze this expense data for the last ${contextData.timeRange}:
            - Total spent: ₹${contextData.totalAmount} across ${contextData.expenseCount} expenses
            - Average per expense: ₹${contextData.avgAmount}
            - Top category: ${contextData.topCategory}
            - Member contributions: ${contextData.memberAnalysis.join(', ')}
            - Weekly trend: ${contextData.weeklyTrend}
            
            Provide specific, actionable insights.`
          }
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return new Response(JSON.stringify({ 
        insights: [
          `Total spending: ₹${contextData.totalAmount} over ${contextData.expenseCount} expenses`,
          `Top category: ${contextData.topCategory}`,
          `Weekly trend: ${contextData.weeklyTrend}`
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    let insights: string[];

    try {
      insights = JSON.parse(aiData.choices[0].message.content);
      if (!Array.isArray(insights)) {
        throw new Error('Invalid format');
      }
    } catch {
      // Fallback to manual insights
      insights = [
        `Total spending: ₹${contextData.totalAmount} over ${contextData.expenseCount} expenses`,
        `Top spending category: ${contextData.topCategory}`,
        `Weekly spending trend: ${contextData.weeklyTrend}`,
        memberAnalysis.length > 1 
          ? `${memberAnalysis[0].name} leads with ${memberAnalysis[0].percentage.toFixed(1)}% of expenses`
          : 'Single member group'
      ];
    }

    console.log('Generated insights:', insights);

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      insights: ['Unable to generate insights at this time.']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});