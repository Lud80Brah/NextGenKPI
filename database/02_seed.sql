-- =============================================================
-- NextGenKPI - Données de démonstration
-- =============================================================

-- host.docker.internal = "la machine Windows hôte" vue depuis un conteneur Docker.
-- C'est là que tournera notre simulateur Modbus pendant le développement.
INSERT INTO automates (nom, adresse_ip, port, unit_id, description) VALUES
    ('Simulateur Modbus', 'host.docker.internal', 502, 1, 'Simulateur local pour le développement');

INSERT INTO variables (automate_id, nom, type_registre, adresse, type_donnee, facteur_echelle, unite, frequence_s) VALUES
    (1, 'Température four',  'holding', 0, 'int16', 0.1,  '°C',  2),
    (1, 'Pression ligne',    'holding', 1, 'int16', 0.01, 'bar', 5);