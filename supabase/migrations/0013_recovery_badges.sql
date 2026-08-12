insert into badges (code, title, description, icon_key, criteria_kind, criteria_value) values
  ('recovery_10', 'Bien récupéré', '10 bilans de forme avec une bonne récupération', 'leaf', 'recovery_days', 10),
  ('recovery_30', 'Maître de la récup', '30 bilans de forme avec une bonne récupération', 'leaf', 'recovery_days', 30)
on conflict (code) do nothing;
