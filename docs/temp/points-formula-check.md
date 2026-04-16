13:  return (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);
61:  const { sortCol, sortDir, onSort, sortFn } = useSort("pts");
69:      if (gp === 0) return { ...team, gp: 0, pts: 0, reb: 0, ast: 0, oreb: 0, dreb: 0, stl: 0, blk: 0, to: 0 };
71:        pts:  a.pts  + calcPts(s),
79:      }), { pts: 0, reb: 0, ast: 0, oreb: 0, dreb: 0, stl: 0, blk: 0, to: 0 });
82:        pts:  tot.pts  / gp,
112:              <SortTh label="PTS"  col="pts"  {...thProps} />
137:                <td className="py-3 px-2 text-center font-bold text-purple-700">{fmt1(team.pts)}</td>
157:  const { sortCol, sortDir, onSort, sortFn } = useSort("ppg");
182:        pts:  rows.reduce((a, s) => a + calcPts(s), 0),
183:        pm2:  rows.reduce((a, s) => a + (s.points_2 || 0), 0),
184:        pm3:  rows.reduce((a, s) => a + (s.points_3 || 0), 0),
185:        ftm:  rows.reduce((a, s) => a + (s.free_throws || 0), 0),
202:        ppg:  sum("pts")  / gp,
237:              <SortTh label="PPG"  col="ppg"  {...thProps} />
271:                  <td className="py-3 px-2 text-center font-bold text-purple-700">{fmt1(player.ppg)}</td>
296:  { key: "ppg",  label: "PPG Leaders",  icon: "🏀" },
362:        pts:  rows.reduce((a, s) => a + calcPts(s), 0),
363:        pm3:  rows.reduce((a, s) => a + (s.points_3 || 0), 0),
375:        ppg: sum("pts") / gp,
