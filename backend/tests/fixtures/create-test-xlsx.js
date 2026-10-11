#!/usr/bin/env node

/**
 * Generates a fictitious XLSX export and a minimal XLSForm
 * for testing the XLSX import path. All data is fake.
 */

const XLSX = require('xlsx');
const path = require('path');

const FIXTURES_DIR = __dirname;

// Minimal XLSForm with just enough fields to test translation
const surveyRows = [
  { type: 'text', name: 'bibliotheque_id', 'label::French (fr)': 'Identifiant unique de la bibliothèque' },
  { type: 'date', name: 'date_collecte', 'label::French (fr)': 'Date de la collecte' },
  { type: 'text', name: 'nom_enqueteur', 'label::French (fr)': "Nom de l'enquêteur" },
  { type: 'select_one villes', name: 'ville', 'label::French (fr)': 'Ville' },
  { type: 'select_one arrondissement', name: 'arrondissement', 'label::French (fr)': 'Arrondissement' },
  { type: 'text', name: 'a1_nom_repondant', 'label::French (fr)': 'A1. Nom du répondant' },
  { type: 'select_multiple fonction_repondant', name: 'a2_fonction', 'label::French (fr)': 'A2. Fonction' },
  { type: 'text', name: 'a3_telephone', 'label::French (fr)': 'A3. Téléphone' },
  { type: 'select_one oui_non_partiel', name: 'a5_autorisation', 'label::French (fr)': 'A5. Autorisation' },
  { type: 'text', name: 'b1_nom_officiel', 'label::French (fr)': 'B1. Nom officiel' },
  { type: 'select_one oui_non', name: 'b2_autre_nom', 'label::French (fr)': 'B2. Autre nom ?' },
  { type: 'select_multiple type_bibliotheque', name: 'b3_type', 'label::French (fr)': 'B3. Type' },
  { type: 'integer', name: 'b4_annee_creation', 'label::French (fr)': 'B4. Année de création' },
  { type: 'text', name: 'b5_responsable', 'label::French (fr)': 'B5. Responsable' },
  { type: 'select_one oui_non_partiel', name: 'b6_fonctionnelle', 'label::French (fr)': 'B6. Fonctionnelle ?' },
  { type: 'text', name: 'c1_quartier', 'label::French (fr)': 'C1. Quartier' },
  { type: 'geopoint', name: 'c3_gps', 'label::French (fr)': 'C3. GPS' },
  { type: 'select_multiple jours_semaine', name: 'd1_jours_ouverture', 'label::French (fr)': 'D1. Jours' },
  { type: 'select_one oui_non_partiel', name: 'e1_gratuit', 'label::French (fr)': 'E1. Gratuit ?' },
  { type: 'select_one oui_non', name: 'f1_lecture_sur_place', 'label::French (fr)': 'F1. Lecture sur place' },
  { type: 'select_one oui_non', name: 'k1_organise_activites', 'label::French (fr)': 'K1. Activités ?' },
  { type: 'select_one oui_non_partiel', name: 'm2_besoin_travaux', 'label::French (fr)': 'M2. Travaux ?' },
];

const choicesRows = [
  { list_name: 'villes', name: 'ndjamena', 'label::French (fr)': "N'Djaména" },
  { list_name: 'villes', name: 'moundou', 'label::French (fr)': 'Moundou' },
  { list_name: 'villes', name: 'autre', 'label::French (fr)': 'Autre' },
  { list_name: 'arrondissement', name: '1er', 'label::French (fr)': '1er' },
  { list_name: 'arrondissement', name: '2e', 'label::French (fr)': '2e' },
  { list_name: 'oui_non', name: 'oui', 'label::French (fr)': 'Oui' },
  { list_name: 'oui_non', name: 'non', 'label::French (fr)': 'Non' },
  { list_name: 'oui_non_partiel', name: 'oui', 'label::French (fr)': 'Oui' },
  { list_name: 'oui_non_partiel', name: 'non', 'label::French (fr)': 'Non' },
  { list_name: 'oui_non_partiel', name: 'partiellement', 'label::French (fr)': 'Partiellement' },
  { list_name: 'fonction_repondant', name: 'responsable', 'label::French (fr)': 'Responsable' },
  { list_name: 'fonction_repondant', name: 'bibliothecaire', 'label::French (fr)': 'Bibliothécaire' },
  { list_name: 'type_bibliotheque', name: 'publique', 'label::French (fr)': 'Publique' },
  { list_name: 'type_bibliotheque', name: 'associative', 'label::French (fr)': 'Associative' },
  { list_name: 'type_bibliotheque', name: 'scolaire', 'label::French (fr)': 'Scolaire' },
  { list_name: 'jours_semaine', name: 'lundi', 'label::French (fr)': 'Lundi' },
  { list_name: 'jours_semaine', name: 'mardi', 'label::French (fr)': 'Mardi' },
  { list_name: 'jours_semaine', name: 'mercredi', 'label::French (fr)': 'Mercredi' },
  { list_name: 'jours_semaine', name: 'jeudi', 'label::French (fr)': 'Jeudi' },
  { list_name: 'jours_semaine', name: 'vendredi', 'label::French (fr)': 'Vendredi' },
];

const settingsRows = [
  { form_title: 'Test Form', form_id: 'test_form' },
];

// Build XLSForm
const xlsFormWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(xlsFormWb, XLSX.utils.json_to_sheet(surveyRows), 'survey');
XLSX.utils.book_append_sheet(xlsFormWb, XLSX.utils.json_to_sheet(choicesRows), 'choices');
XLSX.utils.book_append_sheet(xlsFormWb, XLSX.utils.json_to_sheet(settingsRows), 'settings');
XLSX.writeFile(xlsFormWb, path.join(FIXTURES_DIR, 'test-xlsform.xlsx'));

// Build XLSX export with French labels as headers (like real Kobo export)
const exportHeaders = surveyRows.map(r => r['label::French (fr)']);
exportHeaders.push('_id', '_uuid', '_submission_time');

const exportData = [
  {
    'Identifiant unique de la bibliothèque': 'TEST001',
    'Date de la collecte': '2026-10-01',
    "Nom de l'enquêteur": 'Test Enquêteur',
    'Ville': "N'Djaména",
    'Arrondissement': '2e',
    'A1. Nom du répondant': 'Jean Fictif',
    'A2. Fonction': 'Responsable',
    'A3. Téléphone': '99000001',
    'A5. Autorisation': 'Oui',
    'B1. Nom officiel': 'Bibliothèque Fictive Alpha',
    'B2. Autre nom ?': 'Non',
    'B3. Type': 'Publique',
    'B4. Année de création': 2020,
    'B5. Responsable': 'Ministère Fictif',
    'B6. Fonctionnelle ?': 'Oui',
    'C1. Quartier': 'Quartier Test',
    'C3. GPS': '12.1 15.0 300 5',
    'D1. Jours': 'Lundi Mardi Mercredi',
    'E1. Gratuit ?': 'Oui',
    'F1. Lecture sur place': 'Oui',
    'K1. Activités ?': 'Non',
    'M2. Travaux ?': 'Non',
    '_id': '1001',
    '_uuid': 'aaaaaaaa-bbbb-cccc-dddd-111111111111',
    '_submission_time': '2026-10-01T10:00:00',
  },
  {
    'Identifiant unique de la bibliothèque': 'TEST002',
    'Date de la collecte': '2026-10-02',
    "Nom de l'enquêteur": 'Test Enquêteur',
    'Ville': "N'Djaména",
    'Arrondissement': '1er',
    'A1. Nom du répondant': 'Marie Fictive',
    'A2. Fonction': 'Bibliothécaire',
    'A3. Téléphone': '99000002',
    'A5. Autorisation': 'Non',
    'B1. Nom officiel': 'Bibliothèque Fictive Beta',
    'B2. Autre nom ?': 'Non',
    'B3. Type': 'Associative',
    'B4. Année de création': 2018,
    'B5. Responsable': 'Association Fictive',
    'B6. Fonctionnelle ?': 'Partiellement',
    'C1. Quartier': 'Quartier Beta',
    'C3. GPS': '12.2 15.1 310 8',
    'D1. Jours': 'Lundi Mardi Mercredi Jeudi Vendredi',
    'E1. Gratuit ?': 'Partiellement',
    'F1. Lecture sur place': 'Oui',
    'K1. Activités ?': 'Oui',
    'M2. Travaux ?': 'Oui',
    '_id': '1002',
    '_uuid': 'aaaaaaaa-bbbb-cccc-dddd-222222222222',
    '_submission_time': '2026-10-02T14:00:00',
  },
];

const exportWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(exportWb, XLSX.utils.json_to_sheet(exportData), 'data');
XLSX.writeFile(exportWb, path.join(FIXTURES_DIR, 'kobo-export-test.xlsx'));

console.log('Created test-xlsform.xlsx and kobo-export-test.xlsx');
