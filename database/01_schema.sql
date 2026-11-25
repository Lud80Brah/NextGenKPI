-- NextGenKPI - Schéma de la base de données
-- Exécuté automatiquement par MariaDB au PREMIER démarrage
-- (quand le volume de données est vide).

SET NAMES utf8mb4;  -- encodage complet (accents, symboles comme °C)

-- Table des automates : "où" aller lire les données

CREATE TABLE IF NOT EXISTS automates (
    id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    nom          VARCHAR(100)      NOT NULL,
    adresse_ip   VARCHAR(45)       NOT NULL,              -- 45 caractères : couvre aussi l'IPv6
    port         SMALLINT UNSIGNED NOT NULL DEFAULT 502,  -- port standard Modbus TCP
    unit_id      TINYINT UNSIGNED  NOT NULL DEFAULT 1,    -- identifiant esclave Modbus
    description  VARCHAR(255)      NULL,
    created_at   TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- interdit de déclarer deux fois le même automate
    UNIQUE KEY uq_automate_connexion (adresse_ip, port, unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des variables : "quoi" lire et "à quelle fréquence"
 
CREATE TABLE IF NOT EXISTS variables (
    id               INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    automate_id      INT UNSIGNED      NOT NULL,
    nom              VARCHAR(100)      NOT NULL,
    type_registre    ENUM('holding', 'input', 'coil', 'discrete') NOT NULL DEFAULT 'holding',
    adresse          SMALLINT UNSIGNED NOT NULL,          -- 0 à 65535
    type_donnee      ENUM('int16', 'uint16', 'float32', 'bool')   NOT NULL DEFAULT 'int16',
    facteur_echelle  DOUBLE            NOT NULL DEFAULT 1,
    unite            VARCHAR(20)       NULL,
    frequence_s      INT UNSIGNED      NOT NULL DEFAULT 5,
    actif            BOOLEAN           NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_variables_automate
        FOREIGN KEY (automate_id) REFERENCES automates (id)
        ON DELETE CASCADE,                                -- supprimer un automate supprime ses variables
    CONSTRAINT chk_frequence CHECK (frequence_s >= 1)     -- pas de lecture plus rapide qu'1 s
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des mesures : l'historique horodaté

CREATE TABLE IF NOT EXISTS mesures (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,  -- BIGINT : cette table grossit très vite
    variable_id  INT UNSIGNED    NOT NULL,
    valeur       DOUBLE          NOT NULL,                 -- valeur APRÈS application du facteur d'échelle
    horodatage   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),  -- précision à la milliseconde
    PRIMARY KEY (id),
    -- index composite : accélère "les mesures de la variable X entre date A et date B"
    KEY idx_mesures_variable_date (variable_id, horodatage),
    CONSTRAINT fk_mesures_variable
        FOREIGN KEY (variable_id) REFERENCES variables (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;