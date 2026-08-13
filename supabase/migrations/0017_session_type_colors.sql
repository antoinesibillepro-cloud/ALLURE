alter table session_types add column if not exists color text not null default '#F2C400';

update session_types set color = case name
  when 'Footing récup' then '#5EBA65'
  when 'Endurance fondamentale' then '#5B91D8'
  when 'VMA courte' then '#E4574A'
  when 'VMA moyenne' then '#E4574A'
  when 'VMA longue' then '#E4574A'
  when 'Fractionné' then '#F2924D'
  when 'Seuil' then '#7B6FD6'
  when 'Côtes courtes' then '#4FC3D9'
  when 'Côtes longues' then '#4FC3D9'
  when 'Sortie longue' then '#F2C400'
  when 'Compétition' then '#E4574A'
  when 'Repos' then '#6B7280'
  else color
end;
