3:import { supabase } from "@/lib/supabaseClient";
31:  // 2-team tie: head-to-head first, fall through to points diff if h2h tied
99:      supabase
102:        .eq('is_active', true)
117:      supabase
121:        .eq('is_active', true)
130:      supabase
271:                      <th className="text-center py-3 font-semibold w-20">Win%</th>
