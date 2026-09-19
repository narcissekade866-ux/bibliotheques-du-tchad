-- Up Migration

INSERT INTO ville (nom, statut, centre_lat, centre_long, zoom_defaut)
VALUES ('N''Djaména', 'pilote', 12.1048, 15.0445, 13);

INSERT INTO subdivision_administrative (ville_id, nom, type)
SELECT id, sub.nom, 'arrondissement'
FROM ville, (VALUES
  ('1er arrondissement'),
  ('2e arrondissement'),
  ('3e arrondissement'),
  ('4e arrondissement'),
  ('5e arrondissement'),
  ('6e arrondissement'),
  ('7e arrondissement'),
  ('8e arrondissement'),
  ('9e arrondissement'),
  ('10e arrondissement')
) AS sub(nom)
WHERE ville.nom = 'N''Djaména';

-- Down Migration

DELETE FROM subdivision_administrative
WHERE ville_id = (SELECT id FROM ville WHERE nom = 'N''Djaména');

DELETE FROM ville WHERE nom = 'N''Djaména';
