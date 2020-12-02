const colors = require('colors/safe');
const fs = require('fs');
const JSON5 = require('json5');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const fileTree = require('../lib/file_tree.js');
const idgen = require('../lib/idgen.js');
const matcher = require('../lib/matcher.js')();
const sort = require('../lib/sort.js');
const stemmer = require('../lib/stemmer.js');
const validate = require('../lib/validate.js');

// metadata about the trees
const trees = require('../config/trees.json').trees;



// LETS IMPORT THE FLAGS
const CountryCoder = require('@ideditor/country-coder');
const _flagdata = [
  // {
  //   "flag": "Q122462",
  //   "flagLabel": "flag of Mexico",
  //   "class": "Q2067046",
  //   "subject": "Q96",
  //   "subjectLabel": "Mexico",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mexico.svg"
  // },
  // {
  //   "flag": "Q121688",
  //   "flagLabel": "flag of Spain",
  //   "class": "Q3961007",
  //   "subject": "Q29",
  //   "subjectLabel": "Spain",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Spain.svg"
  // },
  // {
  //   "flag": "Q60521345",
  //   "flagLabel": "flag of the Bashkir Autonomous Soviet Socialist Republic",
  //   "class": "Q14660",
  //   "subject": "Q809806",
  //   "subjectLabel": "Bashkir Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Bashkir%20ASSR.svg"
  // },
  // {
  //   "flag": "Q160255",
  //   "flagLabel": "flag of Peru",
  //   "class": "Q3134691",
  //   "subject": "Q419",
  //   "subjectLabel": "Peru",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Peru.svg"
  // },
  // {
  //   "flag": "Q2290109",
  //   "flagLabel": "flag of the West Indies Federation",
  //   "class": "Q14660",
  //   "subject": "Q652560",
  //   "subjectLabel": "West Indies Federation",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Naval%20Ensign%20of%20the%20West%20Indies%20Federation%20%281958%E2%80%931962%29.svg"
  // },
  // {
  //   "flag": "Q2290109",
  //   "flagLabel": "flag of the West Indies Federation",
  //   "class": "Q14660",
  //   "subject": "Q652560",
  //   "subjectLabel": "West Indies Federation",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20West%20Indies%20Federation%20%281958%E2%80%931962%29.svg"
  // },
  // {
  //   "flag": "Q17622301",
  //   "flagLabel": "flag of the Islamic State of Iraq and the Levant",
  //   "class": "Q4118862",
  //   "subject": "Q2429253",
  //   "subjectLabel": "Islamic State of Iraq and the Levant",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Islamic%20State%20of%20Iraq%20and%20the%20Levant2.svg"
  // },
  // {
  //   "flag": "Q97750846",
  //   "flagLabel": "state flag of Peru",
  //   "class": "Q3235956",
  //   "subject": "Q3649429",
  //   "subjectLabel": "Government of Peru",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Peru%20%28state%29.svg"
  // },
  // {
  //   "flag": "Q375554",
  //   "flagLabel": "flag of the Sahrawi Arab Democratic Republic",
  //   "class": "Q97866401",
  //   "subject": "Q40362",
  //   "subjectLabel": "Sahrawi Arab Democratic Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Sahrawi%20Arab%20Democratic%20Republic.svg"
  // },
  // {
  //   "flag": "Q601206",
  //   "flagLabel": "flag of Tuva",
  //   "class": "Q718583",
  //   "subject": "Q960",
  //   "subjectLabel": "Tuva Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tuva.svg"
  // },
  // {
  //   "flag": "Q830262",
  //   "flagLabel": "flag of Gdańsk",
  //   "class": "Q21850100",
  //   "type": "municipal",
  //   "subject": "Q901974",
  //   "subjectLabel": "Free City of Danzig",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Gdansk%20flag.svg"
  // },
  // {
  //   "flag": "Q830262",
  //   "flagLabel": "flag of Gdańsk",
  //   "class": "Q21850100",
  //   "type": "municipal",
  //   "subject": "Q216173",
  //   "subjectLabel": "Free City of Danzig",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Gdansk%20flag.svg"
  // },
  // {
  //   "flag": "Q830262",
  //   "flagLabel": "flag of Gdańsk",
  //   "class": "Q21850100",
  //   "type": "municipal",
  //   "subject": "Q1792",
  //   "subjectLabel": "Gdańsk",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Gdansk%20flag.svg"
  // },
  // {
  //   "flag": "Q81471",
  //   "flagLabel": "flag of Estonia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q191",
  //   "subjectLabel": "Estonia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Estonia.svg"
  // },
  // {
  //   "flag": "Q83278",
  //   "flagLabel": "flag of the United Kingdom",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q145",
  //   "subjectLabel": "United Kingdom",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20Kingdom.svg"
  // },
  // {
  //   "flag": "Q102198",
  //   "flagLabel": "flag of Sudan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1049",
  //   "subjectLabel": "Sudan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Sudan.svg"
  // },
  // {
  //   "flag": "Q102953",
  //   "flagLabel": "flag of Guinea-Bissau",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1007",
  //   "subjectLabel": "Guinea-Bissau",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Guinea-Bissau.svg"
  // },
  // {
  //   "flag": "Q102967",
  //   "flagLabel": "flag of Ivory Coast",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1008",
  //   "subjectLabel": "Ivory Coast",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20C%C3%B4te%20d%27Ivoire.svg"
  // },
  // {
  //   "flag": "Q102977",
  //   "flagLabel": "flag of Mauritania",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1025",
  //   "subjectLabel": "Mauritania",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mauritania.svg"
  // },
  // {
  //   "flag": "Q103055",
  //   "flagLabel": "flag of Liechtenstein",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q347",
  //   "subjectLabel": "Liechtenstein",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Liechtenstein.svg"
  // },
  // {
  //   "flag": "Q103064",
  //   "flagLabel": "flag of North Korea",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q423",
  //   "subjectLabel": "North Korea",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20North%20Korea.svg"
  // },
  // {
  //   "flag": "Q103084",
  //   "flagLabel": "flag of Burundi",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q967",
  //   "subjectLabel": "Burundi",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Burundi.svg"
  // },
  // {
  //   "flag": "Q122462",
  //   "flagLabel": "flag of Mexico",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q96",
  //   "subjectLabel": "Mexico",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mexico.svg"
  // },
  // {
  //   "flag": "Q128347",
  //   "flagLabel": "Flag of Pakistan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q843",
  //   "subjectLabel": "Pakistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Pakistan%20%28bordered%29.svg"
  // },
  // {
  //   "flag": "Q130442",
  //   "flagLabel": "flag of Benin",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q798431",
  //   "subjectLabel": "Republic of Dahomey",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Benin.svg"
  // },
  // {
  //   "flag": "Q130442",
  //   "flagLabel": "flag of Benin",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q962",
  //   "subjectLabel": "Benin",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Benin.svg"
  // },
  // {
  //   "flag": "Q134247",
  //   "flagLabel": "flag of the United Arab Emirates",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q878",
  //   "subjectLabel": "United Arab Emirates",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20Arab%20Emirates.svg"
  // },
  // {
  //   "flag": "Q134627",
  //   "flagLabel": "flag of the Philippines",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q928",
  //   "subjectLabel": "Philippines",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Philippines.svg"
  // },
  // {
  //   "flag": "Q159538",
  //   "flagLabel": "Flag of Somalia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1045",
  //   "subjectLabel": "Somalia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Somalia.svg"
  // },
  // {
  //   "flag": "Q159741",
  //   "flagLabel": "flag of Nepal",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q837",
  //   "subjectLabel": "Nepal",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Nepal.svg"
  // },
  // {
  //   "flag": "Q159986",
  //   "flagLabel": "flag of Zimbabwe",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q954",
  //   "subjectLabel": "Zimbabwe",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Zimbabwe.svg"
  // },
  // {
  //   "flag": "Q160242",
  //   "flagLabel": "flag of Botswana",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q963",
  //   "subjectLabel": "Botswana",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Botswana.svg"
  // },
  // {
  //   "flag": "Q160250",
  //   "flagLabel": "flag of South Africa",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q258",
  //   "subjectLabel": "South Africa",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Africa.svg"
  // },
  // {
  //   "flag": "Q162068",
  //   "flagLabel": "flag of Ethiopia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q115",
  //   "subjectLabel": "Ethiopia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Ethiopia.svg"
  // },
  // {
  //   "flag": "Q162699",
  //   "flagLabel": "flag of Yemen",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q805",
  //   "subjectLabel": "Yemen",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Yemen.svg"
  // },
  // {
  //   "flag": "Q162999",
  //   "flagLabel": "Flag of Cambodia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q424",
  //   "subjectLabel": "Cambodia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Cambodia.svg"
  // },
  // {
  //   "flag": "Q165538",
  //   "flagLabel": "flag of Venezuela",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q717",
  //   "subjectLabel": "Venezuela",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Venezuela.svg"
  // },
  // {
  //   "flag": "Q165775",
  //   "flagLabel": "flag of the Central African Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q929",
  //   "subjectLabel": "Central African Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Central%20African%20Republic.svg"
  // },
  // {
  //   "flag": "Q171124",
  //   "flagLabel": "flag of Guyana",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q734",
  //   "subjectLabel": "Guyana",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Guyana.svg"
  // },
  // {
  //   "flag": "Q172517",
  //   "flagLabel": "flag of Jamaica",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q766",
  //   "subjectLabel": "Jamaica",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Jamaica.svg"
  // },
  // {
  //   "flag": "Q185271",
  //   "flagLabel": "flag of Papua New Guinea",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q691",
  //   "subjectLabel": "Papua New Guinea",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Papua%20New%20Guinea.svg"
  // },
  // {
  //   "flag": "Q185273",
  //   "flagLabel": "flag of the Falkland Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q9648",
  //   "subjectLabel": "Falkland Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Falkland%20Islands.svg"
  // },
  // {
  //   "flag": "Q189604",
  //   "flagLabel": "flag of Anguilla",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q25228",
  //   "subjectLabel": "Anguilla",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Anguilla.svg"
  // },
  // {
  //   "flag": "Q190014",
  //   "flagLabel": "flag of the Federal Republic of Central America",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q190025",
  //   "subjectLabel": "Federal Republic of Central America",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Federal%20Republic%20of%20Central%20America.svg"
  // },
  // {
  //   "flag": "Q190064",
  //   "flagLabel": "flag of Bermuda",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q23635",
  //   "subjectLabel": "Bermuda",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Bermuda.svg"
  // },
  // {
  //   "flag": "Q191731",
  //   "flagLabel": "flag of Palestine",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q219060",
  //   "subjectLabel": "State of Palestine",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Palestine.svg"
  // },
  // {
  //   "flag": "Q191731",
  //   "flagLabel": "flag of Palestine",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q42620",
  //   "subjectLabel": "Palestinian National Authority",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Palestine.svg"
  // },
  // {
  //   "flag": "Q191731",
  //   "flagLabel": "flag of Palestine",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q26683",
  //   "subjectLabel": "Palestine Liberation Organization",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Palestine.svg"
  // },
  // {
  //   "flag": "Q201987",
  //   "flagLabel": "flag of Somaliland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q34754",
  //   "subjectLabel": "Somaliland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Somaliland.svg"
  // },
  // {
  //   "flag": "Q202189",
  //   "flagLabel": "flag of Niue",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q34020",
  //   "subjectLabel": "Niue",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Niue.svg"
  // },
  // {
  //   "flag": "Q204143",
  //   "flagLabel": "flag of the Turks and Caicos Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q18221",
  //   "subjectLabel": "Turks and Caicos Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Turks%20and%20Caicos%20Islands.svg"
  // },
  // {
  //   "flag": "Q204678",
  //   "flagLabel": "flag of Artsakh",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q244165",
  //   "subjectLabel": "Republic of Artsakh",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Artsakh.svg"
  // },
  // {
  //   "flag": "Q208671",
  //   "flagLabel": "flag of Kurdistan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q41470",
  //   "subjectLabel": "Kurdistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kurdistan.svg"
  // },
  // {
  //   "flag": "Q211579",
  //   "flagLabel": "flag of Saint Helena",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q192184",
  //   "subjectLabel": "Saint Helena, Ascension and Tristan da Cunha",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Saint%20Helena.svg"
  // },
  // {
  //   "flag": "Q235829",
  //   "flagLabel": "flag of Guam",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q16635",
  //   "subjectLabel": "Guam",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Guam.svg"
  // },
  // {
  //   "flag": "Q245269",
  //   "flagLabel": "flag of Montserrat",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q13353",
  //   "subjectLabel": "Montserrat",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Montserrat.svg"
  // },
  // {
  //   "flag": "Q370111",
  //   "flagLabel": "flag of the Federation of Bosnia and Herzegovina",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q11198",
  //   "subjectLabel": "Federation of Bosnia and Herzegovina",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Federation%20of%20Bosnia%20and%20Herzegovina%20%281996%E2%80%932007%29.svg"
  // },
  // {
  //   "flag": "Q484249",
  //   "flagLabel": "flag of Mozambique",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1029",
  //   "subjectLabel": "Mozambique",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mozambique.svg"
  // },
  // {
  //   "flag": "Q495469",
  //   "flagLabel": "flag of Lower Saxony",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1197",
  //   "subjectLabel": "Lower Saxony",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Lower%20Saxony.svg"
  // },
  // {
  //   "flag": "Q543471",
  //   "flagLabel": "flag of the Region of Murcia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5772",
  //   "subjectLabel": "Region of Murcia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Region%20of%20Murcia.svg"
  // },
  // {
  //   "flag": "Q550083",
  //   "flagLabel": "flag of Biafra",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q178469",
  //   "subjectLabel": "Biafra",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Biafra.svg"
  // },
  // {
  //   "flag": "Q854894",
  //   "flagLabel": "flag of the Estonian Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q130280",
  //   "subjectLabel": "Estonian Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Estonian%20Soviet%20Socialist%20Republic%20%281953%E2%80%931990%29.svg"
  // },
  // {
  //   "flag": "Q863844",
  //   "flagLabel": "flag of the Azerbaijan Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q131337",
  //   "subjectLabel": "Azerbaijan Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Azerbaijan%20Soviet%20Socialist%20Republic%20%281956%E2%80%931991%29.svg"
  // },
  // {
  //   "flag": "Q877588",
  //   "flagLabel": "flag of the Ukrainian Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q133356",
  //   "subjectLabel": "Ukrainian Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Ukrainian%20Soviet%20Socialist%20Republic.svg"
  // },
  // {
  //   "flag": "Q1135849",
  //   "flagLabel": "flag of Zanzibar",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1774",
  //   "subjectLabel": "Zanzibar",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Zanzibar.svg"
  // },
  // {
  //   "flag": "Q1420736",
  //   "flagLabel": "flag of the Republic of Venice",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q641",
  //   "subjectLabel": "Venice",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Most%20Serene%20Republic%20of%20Venice.svg"
  // },
  // {
  //   "flag": "Q2062378",
  //   "flagLabel": "flag of the Republic of Serbian Krajina",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q211853",
  //   "subjectLabel": "Republic of Serbian Krajina",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/State%20Flag%20of%20Serbian%20Krajina%20%281991%29.svg"
  // },
  // {
  //   "flag": "Q2366349",
  //   "flagLabel": "Morning Star flag",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q3845",
  //   "subjectLabel": "Western New Guinea",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Morning%20Star%20flag.svg"
  // },
  // {
  //   "flag": "Q3501216",
  //   "flagLabel": "Flag of North Ingria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1343485",
  //   "subjectLabel": "North Ingria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Inkerin%20lippu.svg"
  // },
  // {
  //   "flag": "Q4575",
  //   "flagLabel": "flag of the Faroe Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q4628",
  //   "subjectLabel": "Faroe Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Faroe%20Islands.svg"
  // },
  // {
  //   "flag": "Q43175",
  //   "flagLabel": "flag of Japan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q17",
  //   "subjectLabel": "Japan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Japan.svg"
  // },
  // {
  //   "flag": "Q59070",
  //   "flagLabel": "flag of the Republic of Mordovia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5340",
  //   "subjectLabel": "Republic of Mordovia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mordovia.svg"
  // },
  // {
  //   "flag": "Q60149",
  //   "flagLabel": "flag of Denmark",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q756617",
  //   "subjectLabel": "Danish Realm",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Denmark.svg"
  // },
  // {
  //   "flag": "Q60149",
  //   "flagLabel": "flag of Denmark",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q35",
  //   "subjectLabel": "Denmark",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Denmark.svg"
  // },
  // {
  //   "flag": "Q75374",
  //   "flagLabel": "flag of the Solomon Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q685",
  //   "subjectLabel": "Solomon Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Solomon%20Islands.svg"
  // },
  // {
  //   "flag": "Q79198",
  //   "flagLabel": "flag of Vatican City",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q237",
  //   "subjectLabel": "Vatican City",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Vatican%20City.svg"
  // },
  // {
  //   "flag": "Q79874",
  //   "flagLabel": "Flag of Afghanistan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q889",
  //   "subjectLabel": "Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan.svg"
  // },
  // {
  //   "flag": "Q81676",
  //   "flagLabel": "flag of Australia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q408",
  //   "subjectLabel": "Australia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Australia%20%28converted%29.svg"
  // },
  // {
  //   "flag": "Q81970",
  //   "flagLabel": "flag of Hungary",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q28",
  //   "subjectLabel": "Hungary",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Hungary.svg"
  // },
  // {
  //   "flag": "Q82205",
  //   "flagLabel": "Flag of Ireland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q27",
  //   "subjectLabel": "Ireland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Ireland.svg"
  // },
  // {
  //   "flag": "Q101472",
  //   "flagLabel": "flag of Indonesia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q252",
  //   "subjectLabel": "Indonesia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Indonesia.svg"
  // },
  // {
  //   "flag": "Q102993",
  //   "flagLabel": "flag of Eswatini",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1050",
  //   "subjectLabel": "Eswatini",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Eswatini.svg"
  // },
  // {
  //   "flag": "Q103447",
  //   "flagLabel": "flag of the Bahamas",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q778",
  //   "subjectLabel": "The Bahamas",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Bahamas.svg"
  // },
  // {
  //   "flag": "Q104969",
  //   "flagLabel": "flag of Lesotho",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1013",
  //   "subjectLabel": "Lesotho",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Lesotho.svg"
  // },
  // {
  //   "flag": "Q117347",
  //   "flagLabel": "flag of Ulster",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q93195",
  //   "subjectLabel": "Ulster",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Ulster.svg"
  // },
  // {
  //   "flag": "Q121688",
  //   "flagLabel": "flag of Spain",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q29",
  //   "subjectLabel": "Spain",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Spain.svg"
  // },
  // {
  //   "flag": "Q127179",
  //   "flagLabel": "flag of Bangladesh",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q902",
  //   "subjectLabel": "Bangladesh",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Bangladesh.svg"
  // },
  // {
  //   "flag": "Q130458",
  //   "flagLabel": "flag of Egypt",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q79",
  //   "subjectLabel": "Egypt",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Egypt.svg"
  // },
  // {
  //   "flag": "Q130774",
  //   "flagLabel": "flag of Argentina",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q414",
  //   "subjectLabel": "Argentina",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Argentina.svg"
  // },
  // {
  //   "flag": "Q131204",
  //   "flagLabel": "flag of Vietnam",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q881",
  //   "subjectLabel": "Vietnam",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Vietnam.svg"
  // },
  // {
  //   "flag": "Q131650",
  //   "flagLabel": "flag of Kazakhstan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q232",
  //   "subjectLabel": "Kazakhstan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kazakhstan.svg"
  // },
  // {
  //   "flag": "Q133022",
  //   "flagLabel": "flag of Luxembourg",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q32",
  //   "subjectLabel": "Luxembourg",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Luxembourg.svg"
  // },
  // {
  //   "flag": "Q147776",
  //   "flagLabel": "flag of the Komi Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2073",
  //   "subjectLabel": "Komi Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Komi.svg"
  // },
  // {
  //   "flag": "Q159865",
  //   "flagLabel": "Flag of Morocco",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1028",
  //   "subjectLabel": "Morocco",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Morocco.svg"
  // },
  // {
  //   "flag": "Q160260",
  //   "flagLabel": "flag of New Zealand",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q664",
  //   "subjectLabel": "New Zealand",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20New%20Zealand.svg"
  // },
  // {
  //   "flag": "Q160877",
  //   "flagLabel": "flag of Saudi Arabia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q851",
  //   "subjectLabel": "Saudi Arabia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Saudi%20Arabia.svg"
  // },
  // {
  //   "flag": "Q162781",
  //   "flagLabel": "flag of Iraq",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q796",
  //   "subjectLabel": "Iraq",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Iraq.svg"
  // },
  // {
  //   "flag": "Q162789",
  //   "flagLabel": "flag of Tunisia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q948",
  //   "subjectLabel": "Tunisia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tunisia.svg"
  // },
  // {
  //   "flag": "Q163753",
  //   "flagLabel": "flag of Myanmar",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q836",
  //   "subjectLabel": "Myanmar",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Myanmar.svg"
  // },
  // {
  //   "flag": "Q165552",
  //   "flagLabel": "flag of Mongolia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q711",
  //   "subjectLabel": "Mongolia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mongolia.svg"
  // },
  // {
  //   "flag": "Q165811",
  //   "flagLabel": "flag of Chad",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q657",
  //   "subjectLabel": "Chad",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Chad.svg"
  // },
  // {
  //   "flag": "Q169441",
  //   "flagLabel": "flag of the Maldives",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q826",
  //   "subjectLabel": "Maldives",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Maldives.svg"
  // },
  // {
  //   "flag": "Q170555",
  //   "flagLabel": "flag of Eritrea",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q986",
  //   "subjectLabel": "Eritrea",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Eritrea.svg"
  // },
  // {
  //   "flag": "Q170795",
  //   "flagLabel": "Flag of Liberia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1014",
  //   "subjectLabel": "Liberia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Liberia.svg"
  // },
  // {
  //   "flag": "Q170809",
  //   "flagLabel": "flag of Tanzania",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q924",
  //   "subjectLabel": "Tanzania",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tanzania.svg"
  // },
  // {
  //   "flag": "Q171103",
  //   "flagLabel": "flag of Uruguay",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q77",
  //   "subjectLabel": "Uruguay",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Uruguay.svg"
  // },
  // {
  //   "flag": "Q173548",
  //   "flagLabel": "flag of Mauritius",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1027",
  //   "subjectLabel": "Mauritius",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mauritius.svg"
  // },
  // {
  //   "flag": "Q174487",
  //   "flagLabel": "flag of the Cayman Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5785",
  //   "subjectLabel": "Cayman Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Cayman%20Islands%20%28pre-1999%29.svg"
  // },
  // {
  //   "flag": "Q174487",
  //   "flagLabel": "flag of the Cayman Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5785",
  //   "subjectLabel": "Cayman Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Cayman%20Islands.svg"
  // },
  // {
  //   "flag": "Q184283",
  //   "flagLabel": "flag of Trinidad and Tobago",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q754",
  //   "subjectLabel": "Trinidad and Tobago",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Trinidad%20and%20Tobago.svg"
  // },
  // {
  //   "flag": "Q184596",
  //   "flagLabel": "flag of Saint Lucia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q760",
  //   "subjectLabel": "Saint Lucia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Saint%20Lucia.svg"
  // },
  // {
  //   "flag": "Q188072",
  //   "flagLabel": "flag of Tonga",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q678",
  //   "subjectLabel": "Tonga",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tonga.svg"
  // },
  // {
  //   "flag": "Q188609",
  //   "flagLabel": "flag of Palau",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q695",
  //   "subjectLabel": "Palau",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Palau.svg"
  // },
  // {
  //   "flag": "Q190648",
  //   "flagLabel": "flag of the Federated States of Micronesia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q702",
  //   "subjectLabel": "Federated States of Micronesia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Federated%20States%20of%20Micronesia.svg"
  // },
  // {
  //   "flag": "Q204666",
  //   "flagLabel": "flag of the United States Virgin Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q11703",
  //   "subjectLabel": "United States Virgin Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20States%20Virgin%20Islands.svg"
  // },
  // {
  //   "flag": "Q225360",
  //   "flagLabel": "flag of Bulgaria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q219",
  //   "subjectLabel": "Bulgaria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Bulgaria.svg"
  // },
  // {
  //   "flag": "Q235445",
  //   "flagLabel": "flag of Norfolk Island",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q31057",
  //   "subjectLabel": "Norfolk Island",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Norfolk%20Island.svg"
  // },
  // {
  //   "flag": "Q235846",
  //   "flagLabel": "flag of the Pitcairn Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q35672",
  //   "subjectLabel": "Pitcairn Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Pitcairn%20Islands.svg"
  // },
  // {
  //   "flag": "Q238759",
  //   "flagLabel": "flag of Macau",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q14773",
  //   "subjectLabel": "Macau",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Macau.svg"
  // },
  // {
  //   "flag": "Q241781",
  //   "flagLabel": "flag of Madeira",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q26253",
  //   "subjectLabel": "Madeira",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Madeira.svg"
  // },
  // {
  //   "flag": "Q270377",
  //   "flagLabel": "flag of Tokelau",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q36823",
  //   "subjectLabel": "Tokelau",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tokelau.svg"
  // },
  // {
  //   "flag": "Q302382",
  //   "flagLabel": "flag of Kabardino-Balkaria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5267",
  //   "subjectLabel": "Kabardino-Balkaria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kabardino-Balkaria.svg"
  // },
  // {
  //   "flag": "Q613188",
  //   "flagLabel": "flag of the Chuvash Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5466",
  //   "subjectLabel": "Chuvash Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Chuvashia.svg"
  // },
  // {
  //   "flag": "Q652088",
  //   "flagLabel": "flag of Krasnodar Krai",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q3680",
  //   "subjectLabel": "Krasnodar Krai",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Krasnodar%20Krai.svg"
  // },
  // {
  //   "flag": "Q719140",
  //   "flagLabel": "flag of Serbia and Montenegro",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q37024",
  //   "subjectLabel": "Serbia and Montenegro",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Yugoslavia%20%281992%E2%80%932003%29%3B%20Flag%20of%20Serbia%20and%20Montenegro%20%282003%E2%80%932006%29.svg"
  // },
  // {
  //   "flag": "Q830262",
  //   "flagLabel": "flag of Gdańsk",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q901974",
  //   "subjectLabel": "Free City of Danzig",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Gdansk%20flag.svg"
  // },
  // {
  //   "flag": "Q830262",
  //   "flagLabel": "flag of Gdańsk",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q216173",
  //   "subjectLabel": "Free City of Danzig",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Gdansk%20flag.svg"
  // },
  // {
  //   "flag": "Q830262",
  //   "flagLabel": "flag of Gdańsk",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1792",
  //   "subjectLabel": "Gdańsk",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Gdansk%20flag.svg"
  // },
  // {
  //   "flag": "Q1144506",
  //   "flagLabel": "flag of South Kasai",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q639073",
  //   "subjectLabel": "South Kasai",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Kasai.svg"
  // },
  // {
  //   "flag": "Q1888815",
  //   "flagLabel": "flag of the Orange Free State",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q218023",
  //   "subjectLabel": "Orange Free State",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Orange%20Free%20State.svg"
  // },
  // {
  //   "flag": "Q2080655",
  //   "flagLabel": "Flag of Kingdom of Wessex",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q105313",
  //   "subjectLabel": "Kingdom of Wessex",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Wessex.svg"
  // },
  // {
  //   "flag": "Q2361840",
  //   "flagLabel": "flag of Great Britain",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q161885",
  //   "subjectLabel": "Great Britain",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Great%20Britain%20%281707%E2%80%931800%29.svg"
  // },
  // {
  //   "flag": "Q2376574",
  //   "flagLabel": "White-Red-White Flag",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q842199",
  //   "subjectLabel": "Belarusian People's Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Belarus%20%281918%2C%201991%E2%80%931995%29.svg"
  // },
  // {
  //   "flag": "Q2376574",
  //   "flagLabel": "White-Red-White Flag",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q184",
  //   "subjectLabel": "Belarus",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Belarus%20%281918%2C%201991%E2%80%931995%29.svg"
  // },
  // {
  //   "flag": "Q3314598",
  //   "flagLabel": "flag of the Second Spanish Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q178038",
  //   "subjectLabel": "Second Spanish Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Spain%20%281931%E2%80%931939%29.svg"
  // },
  // {
  //   "flag": "Q3633957",
  //   "flagLabel": "flag of the Sovereign Military Order of Malta",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q190353",
  //   "subjectLabel": "Sovereign Military Order of Malta",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Order%20of%20St.%20John%20%28various%29.svg"
  // },
  // {
  //   "flag": "Q4486017",
  //   "flagLabel": "Flag of the Far Eastern Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q61292",
  //   "subjectLabel": "Far Eastern Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Far%20Eastern%20Republic%20%28Constitutional%20option%29.svg"
  // },
  // {
  //   "flag": "Q4486555",
  //   "flagLabel": "flag of Korean Empire",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q28233",
  //   "subjectLabel": "Korean Empire",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Korea%20%281882%E2%80%931910%29.svg"
  // },
  // {
  //   "flag": "Q4486877",
  //   "flagLabel": "flag of Maakhir",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1322424",
  //   "subjectLabel": "Maakhir",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Maakhir%202008.svg"
  // },
  // {
  //   "flag": "Q4487814",
  //   "flagLabel": "Q4487814",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5428",
  //   "subjectLabel": "Siberia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Siberia.svg"
  // },
  // {
  //   "flag": "Q4487873",
  //   "flagLabel": "flag of the Commonwealth",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q21",
  //   "subjectLabel": "England",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20The%20Commonwealth.svg"
  // },
  // {
  //   "flag": "Q4488235",
  //   "flagLabel": "Flag of Federation of South Arabia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q834486",
  //   "subjectLabel": "Federation of South Arabia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Federation%20of%20South%20Arabia.svg"
  // },
  // {
  //   "flag": "Q5456846",
  //   "flagLabel": "flag of the Arab Federation",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q146713",
  //   "subjectLabel": "Arab Federation",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Arab%20Federation.svg"
  // },
  // {
  //   "flag": "Q5456861",
  //   "flagLabel": "flag of the Couto Misto",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q953432",
  //   "subjectLabel": "Couto Misto",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Couto%20Misto.svg"
  // },
  // {
  //   "flag": "Q5456879",
  //   "flagLabel": "flag of the Mughal Empire",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q33296",
  //   "subjectLabel": "Mughal Empire",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Alam%20of%20the%20Mughal%20Empire.svg"
  // },
  // {
  //   "flag": "Q5456893",
  //   "flagLabel": "flag of the Tuvan People's Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q816709",
  //   "subjectLabel": "Tuvan People's Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Tuvan%20People%27s%20Republic%20%281943-1944%29.svg"
  // },
  // {
  //   "flag": "Q11698198",
  //   "flagLabel": "flag of the Yemen Arab Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q267584",
  //   "subjectLabel": "Yemen Arab Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20North%20Yemen.svg"
  // },
  // {
  //   "flag": "Q11907904",
  //   "flagLabel": "Flag of Natalia Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1029847",
  //   "subjectLabel": "Natalia Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Natalia%20Republic.svg"
  // },
  // {
  //   "flag": "Q15712832",
  //   "flagLabel": "States Flag",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q382593",
  //   "subjectLabel": "New Netherland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Statenvlag.svg"
  // },
  // {
  //   "flag": "Q15712832",
  //   "flagLabel": "States Flag",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q170072",
  //   "subjectLabel": "Dutch Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Statenvlag.svg"
  // },
  // {
  //   "flag": "Q16630951",
  //   "flagLabel": "Senyera",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q204920",
  //   "subjectLabel": "Crown of Aragon",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Catalonia.svg"
  // },
  // {
  //   "flag": "Q16712671",
  //   "flagLabel": "Flag of the Emirate of Bukhara",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q746558",
  //   "subjectLabel": "Emirate of Bukhara",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Emirate%20of%20Bukhara.svg"
  // },
  // {
  //   "flag": "Q21662040",
  //   "flagLabel": "Flag of Khorezm People's Soviet Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q61291",
  //   "subjectLabel": "Khorezm People's Soviet Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Khiva%201920-1923.svg"
  // },
  // {
  //   "flag": "Q24701080",
  //   "flagLabel": "flag of the Russian Soviet Federative Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2184",
  //   "subjectLabel": "Russian Soviet Federative Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Russian%20Soviet%20Federative%20Socialist%20Republic%20%281937%E2%80%931954%29.svg"
  // },
  // {
  //   "flag": "Q24896760",
  //   "flagLabel": "flag of the United States of the Ionian Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1063498",
  //   "subjectLabel": "United States of the Ionian Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20States%20of%20the%20Ionian%20Islands.svg"
  // },
  // {
  //   "flag": "Q27927697",
  //   "flagLabel": "flag of Cape Verde (1975–1992)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1011",
  //   "subjectLabel": "Cape Verde",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Cape%20Verde%20%281975%E2%80%931992%29.svg"
  // },
  // {
  //   "flag": "Q28045093",
  //   "flagLabel": "flag of Malaya",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1479726",
  //   "subjectLabel": "Malaya",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Malaya.svg"
  // },
  // {
  //   "flag": "Q28324033",
  //   "flagLabel": "flag of Neutral Moresnet",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q151938",
  //   "subjectLabel": "Neutral Moresnet",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Moresnet.svg"
  // },
  // {
  //   "flag": "Q28828115",
  //   "flagLabel": "flag of Muscat and Oman",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q157734",
  //   "subjectLabel": "Muscat and Oman",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Muscat.svg"
  // },
  // {
  //   "flag": "Q28828119",
  //   "flagLabel": "flag of Afghanistan (1880-1901)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1335260",
  //   "subjectLabel": "Emirate of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281880%E2%80%931901%29.svg"
  // },
  // {
  //   "flag": "Q28829376",
  //   "flagLabel": "flag of Afghanistan (1919–1926)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1335260",
  //   "subjectLabel": "Emirate of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281919%E2%80%931921%29.svg"
  // },
  // {
  //   "flag": "Q28829383",
  //   "flagLabel": "flag of Afghanistan (1928)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1138904",
  //   "subjectLabel": "Kingdom of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281928%29.svg"
  // },
  // {
  //   "flag": "Q28829388",
  //   "flagLabel": "flag of Afghanistan (1928–1929)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1138904",
  //   "subjectLabel": "Kingdom of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281928%E2%80%931929%29.svg"
  // },
  // {
  //   "flag": "Q28829438",
  //   "flagLabel": "flag of Afghanistan (1997–2001)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q427941",
  //   "subjectLabel": "Islamic Emirate of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Taliban.svg"
  // },
  // {
  //   "flag": "Q60521345",
  //   "flagLabel": "flag of the Bashkir Autonomous Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q809806",
  //   "subjectLabel": "Bashkir Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Bashkir%20ASSR.svg"
  // },
  // {
  //   "flag": "Q80110",
  //   "flagLabel": "flag of Canada",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q16",
  //   "subjectLabel": "Canada",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Canada%20%28Pantone%29.svg"
  // },
  // {
  //   "flag": "Q81477",
  //   "flagLabel": "flag of Lithuania",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q37",
  //   "subjectLabel": "Lithuania",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Lithuania.svg"
  // },
  // {
  //   "flag": "Q81526",
  //   "flagLabel": "Flag of Andorra",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q228",
  //   "subjectLabel": "Andorra",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Andorra.svg"
  // },
  // {
  //   "flag": "Q81952",
  //   "flagLabel": "flag of Turkey",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q43",
  //   "subjectLabel": "Turkey",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Turkey.svg"
  // },
  // {
  //   "flag": "Q83149",
  //   "flagLabel": "flag of Norway",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q20",
  //   "subjectLabel": "Norway",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Norway.svg"
  // },
  // {
  //   "flag": "Q83392",
  //   "flagLabel": "Flag of Algeria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q262",
  //   "subjectLabel": "Algeria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Algeria.svg"
  // },
  // {
  //   "flag": "Q101769",
  //   "flagLabel": "flag of Gabon",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1000",
  //   "subjectLabel": "Gabon",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Gabon.svg"
  // },
  // {
  //   "flag": "Q102960",
  //   "flagLabel": "flag of Nigeria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1033",
  //   "subjectLabel": "Nigeria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Nigeria.svg"
  // },
  // {
  //   "flag": "Q104351",
  //   "flagLabel": "flag of Barbados",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q244",
  //   "subjectLabel": "Barbados",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Barbados.svg"
  // },
  // {
  //   "flag": "Q117758",
  //   "flagLabel": "flag of Kiribati",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q710",
  //   "subjectLabel": "Kiribati",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kiribati.svg"
  // },
  // {
  //   "flag": "Q119605",
  //   "flagLabel": "flag of New Jersey",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1408",
  //   "subjectLabel": "New Jersey",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20New%20Jersey.svg"
  // },
  // {
  //   "flag": "Q127155",
  //   "flagLabel": "flag of the Czech Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q213",
  //   "subjectLabel": "Czech Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Czech%20Republic.svg"
  // },
  // {
  //   "flag": "Q127974",
  //   "flagLabel": "flag of Ukraine",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q212",
  //   "subjectLabel": "Ukraine",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Ukraine.svg"
  // },
  // {
  //   "flag": "Q128480",
  //   "flagLabel": "flag of Israel",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q801",
  //   "subjectLabel": "Israel",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Israel.svg"
  // },
  // {
  //   "flag": "Q131469",
  //   "flagLabel": "flag of Malta",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q233",
  //   "subjectLabel": "Malta",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Malta.svg"
  // },
  // {
  //   "flag": "Q134252",
  //   "flagLabel": "flag of Burkina Faso",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q965",
  //   "subjectLabel": "Burkina Faso",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Burkina%20Faso.svg"
  // },
  // {
  //   "flag": "Q134521",
  //   "flagLabel": "flag of Bhutan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q917",
  //   "subjectLabel": "Bhutan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Bhutan.svg"
  // },
  // {
  //   "flag": "Q134874",
  //   "flagLabel": "flag of Bolivia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q750",
  //   "subjectLabel": "Bolivia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Bolivia.svg"
  // },
  // {
  //   "flag": "Q134885",
  //   "flagLabel": "flag of Thailand",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q869",
  //   "subjectLabel": "Thailand",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Thailand.svg"
  // },
  // {
  //   "flag": "Q134933",
  //   "flagLabel": "flag of Senegal",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1041",
  //   "subjectLabel": "Senegal",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Senegal.svg"
  // },
  // {
  //   "flag": "Q135034",
  //   "flagLabel": "flag of Antigua and Barbuda",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q781",
  //   "subjectLabel": "Antigua and Barbuda",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Antigua%20and%20Barbuda.svg"
  // },
  // {
  //   "flag": "Q158591",
  //   "flagLabel": "flag of Guernsey",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q25230",
  //   "subjectLabel": "Guernsey",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Guernsey.svg"
  // },
  // {
  //   "flag": "Q160124",
  //   "flagLabel": "flag of Tajikistan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q863",
  //   "subjectLabel": "Tajikistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tajikistan.svg"
  // },
  // {
  //   "flag": "Q160425",
  //   "flagLabel": "flag of Colombia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q739",
  //   "subjectLabel": "Colombia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Colombia.svg"
  // },
  // {
  //   "flag": "Q160676",
  //   "flagLabel": "flag of Ghana",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q117",
  //   "subjectLabel": "Ghana",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Ghana.svg"
  // },
  // {
  //   "flag": "Q160872",
  //   "flagLabel": "flag of Chile",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q298",
  //   "subjectLabel": "Chile",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Chile.svg"
  // },
  // {
  //   "flag": "Q162980",
  //   "flagLabel": "flag of Montenegro",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q236",
  //   "subjectLabel": "Montenegro",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Montenegro.svg"
  // },
  // {
  //   "flag": "Q163333",
  //   "flagLabel": "Flag of the Republic of the Congo",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q971",
  //   "subjectLabel": "Republic of the Congo",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Republic%20of%20the%20Congo.svg"
  // },
  // {
  //   "flag": "Q164584",
  //   "flagLabel": "flag of the Democratic Republic of the Congo",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q974",
  //   "subjectLabel": "Democratic Republic of the Congo",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Democratic%20Republic%20of%20the%20Congo.svg"
  // },
  // {
  //   "flag": "Q165230",
  //   "flagLabel": "flag of the Soviet Union",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q15180",
  //   "subjectLabel": "Soviet Union",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Soviet%20Union.svg"
  // },
  // {
  //   "flag": "Q165550",
  //   "flagLabel": "flag of Oman",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q842",
  //   "subjectLabel": "Oman",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Oman.svg"
  // },
  // {
  //   "flag": "Q165822",
  //   "flagLabel": "flag of Namibia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1030",
  //   "subjectLabel": "Namibia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Namibia.svg"
  // },
  // {
  //   "flag": "Q165905",
  //   "flagLabel": "flag of Kenya",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q114",
  //   "subjectLabel": "Kenya",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kenya.svg"
  // },
  // {
  //   "flag": "Q168912",
  //   "flagLabel": "flag of Sierra Leone",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1044",
  //   "subjectLabel": "Sierra Leone",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Sierra%20Leone.svg"
  // },
  // {
  //   "flag": "Q168925",
  //   "flagLabel": "flag of San Marino",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q238",
  //   "subjectLabel": "San Marino",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20San%20Marino.svg"
  // },
  // {
  //   "flag": "Q168935",
  //   "flagLabel": "flag of Malaysia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q833",
  //   "subjectLabel": "Malaysia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Malaysia.svg"
  // },
  // {
  //   "flag": "Q168941",
  //   "flagLabel": "pepito",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q804",
  //   "subjectLabel": "Panama",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Panama.svg"
  // },
  // {
  //   "flag": "Q170543",
  //   "flagLabel": "flag of Rwanda",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1037",
  //   "subjectLabel": "Rwanda",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Rwanda.svg"
  // },
  // {
  //   "flag": "Q170814",
  //   "flagLabel": "flag of Zambia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q953",
  //   "subjectLabel": "Zambia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Zambia.svg"
  // },
  // {
  //   "flag": "Q171117",
  //   "flagLabel": "flag of England",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q21",
  //   "subjectLabel": "England",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20England.svg"
  // },
  // {
  //   "flag": "Q172533",
  //   "flagLabel": "flag of Nicaragua",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q811",
  //   "subjectLabel": "Nicaragua",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Nicaragua.svg"
  // },
  // {
  //   "flag": "Q173201",
  //   "flagLabel": "flag of the Seychelles",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1042",
  //   "subjectLabel": "Seychelles",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Seychelles.svg"
  // },
  // {
  //   "flag": "Q173554",
  //   "flagLabel": "flag of El Salvador",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q792",
  //   "subjectLabel": "El Salvador",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20El%20Salvador.svg"
  // },
  // {
  //   "flag": "Q181120",
  //   "flagLabel": "flag of Saint Kitts and Nevis",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q763",
  //   "subjectLabel": "Saint Kitts and Nevis",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Saint%20Kitts%20and%20Nevis.svg"
  // },
  // {
  //   "flag": "Q182782",
  //   "flagLabel": "flag of South Sudan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q958",
  //   "subjectLabel": "South Sudan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Sudan.svg"
  // },
  // {
  //   "flag": "Q184584",
  //   "flagLabel": "flag of Saint Vincent and the Grenadines",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q757",
  //   "subjectLabel": "Saint Vincent and the Grenadines",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Saint%20Vincent%20and%20the%20Grenadines.svg"
  // },
  // {
  //   "flag": "Q185277",
  //   "flagLabel": "flag of Nauru",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q697",
  //   "subjectLabel": "Nauru",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Nauru.svg"
  // },
  // {
  //   "flag": "Q188839",
  //   "flagLabel": "flag of Aruba",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q21203",
  //   "subjectLabel": "Aruba",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Aruba.svg"
  // },
  // {
  //   "flag": "Q189612",
  //   "flagLabel": "flag of Jersey",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q785",
  //   "subjectLabel": "Jersey",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Jersey.svg"
  // },
  // {
  //   "flag": "Q193693",
  //   "flagLabel": "flag of the Cook Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q26988",
  //   "subjectLabel": "Cook Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Cook%20Islands.svg"
  // },
  // {
  //   "flag": "Q200260",
  //   "flagLabel": "flag of the Marshall Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q709",
  //   "subjectLabel": "Marshall Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Marshall%20Islands.svg"
  // },
  // {
  //   "flag": "Q202610",
  //   "flagLabel": "flag of Åland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5689",
  //   "subjectLabel": "Åland Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20%C3%85land.svg"
  // },
  // {
  //   "flag": "Q207518",
  //   "flagLabel": "flag of Northern Cyprus",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q23681",
  //   "subjectLabel": "Turkish Republic of Northern Cyprus",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Turkish%20Republic%20of%20Northern%20Cyprus.svg"
  // },
  // {
  //   "flag": "Q209060",
  //   "flagLabel": "flag of South Ossetia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q23427",
  //   "subjectLabel": "South Ossetia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Ossetia.svg"
  // },
  // {
  //   "flag": "Q209963",
  //   "flagLabel": "flag of the Netherlands Antilles",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q25227",
  //   "subjectLabel": "Netherlands Antilles",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Netherlands%20Antilles%20%281986%E2%80%932010%29.svg"
  // },
  // {
  //   "flag": "Q225489",
  //   "flagLabel": "flag of Crimea",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q756294",
  //   "subjectLabel": "Autonomous Republic of Crimea",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Crimea.svg"
  // },
  // {
  //   "flag": "Q242502",
  //   "flagLabel": "flag of American Samoa",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q16641",
  //   "subjectLabel": "American Samoa",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20American%20Samoa.svg"
  // },
  // {
  //   "flag": "Q245213",
  //   "flagLabel": "flag of South Georgia and the South Sandwich Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q35086",
  //   "subjectLabel": "South Georgia and the South Sandwich Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Georgia%20and%20the%20South%20Sandwich%20Islands.svg"
  // },
  // {
  //   "flag": "Q279667",
  //   "flagLabel": "flag of the Republic of Adygea",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q3734",
  //   "subjectLabel": "Republic of Adygea",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Adygea.svg"
  // },
  // {
  //   "flag": "Q283772",
  //   "flagLabel": "flag of Gagauzia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q164819",
  //   "subjectLabel": "Gagauzia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Gagauzia.svg"
  // },
  // {
  //   "flag": "Q328889",
  //   "flagLabel": "flag of the Northern Mariana Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q16644",
  //   "subjectLabel": "Northern Mariana Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Northern%20Mariana%20Islands.svg"
  // },
  // {
  //   "flag": "Q462498",
  //   "flagLabel": "flag of Tatarstan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5481",
  //   "subjectLabel": "Republic of Tatarstan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tatarstan.svg"
  // },
  // {
  //   "flag": "Q462674",
  //   "flagLabel": "flag of Transvaal",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q550374",
  //   "subjectLabel": "South African Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Transvaal%20Colony%20%281904%E2%80%931910%29.svg"
  // },
  // {
  //   "flag": "Q463964",
  //   "flagLabel": "flag of Northern Ireland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q26",
  //   "subjectLabel": "Northern Ireland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20Kingdom.svg"
  // },
  // {
  //   "flag": "Q530665",
  //   "flagLabel": "flag of Orkney",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q22",
  //   "subjectLabel": "Scotland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/2007%20Flag%20of%20Orkney.svg"
  // },
  // {
  //   "flag": "Q578054",
  //   "flagLabel": "flag of Karachay-Cherkessia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5328",
  //   "subjectLabel": "Karachay-Cherkess Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Karachay-Cherkessia.svg"
  // },
  // {
  //   "flag": "Q604735",
  //   "flagLabel": "flag of Sint Maarten",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q26273",
  //   "subjectLabel": "Sint Maarten",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Sint%20Maarten.svg"
  // },
  // {
  //   "flag": "Q656172",
  //   "flagLabel": "flag of the Transcaucasian Socialist Federative Soviet Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q545205",
  //   "subjectLabel": "Transcaucasian Socialist Federative Soviet Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Transcaucasian%20SFSR.svg"
  // },
  // {
  //   "flag": "Q687378",
  //   "flagLabel": "flag of Prussia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q38872",
  //   "subjectLabel": "Prussia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Prussia%20%281892-1918%29.svg"
  // },
  // {
  //   "flag": "Q699554",
  //   "flagLabel": "flag of Manchukuo",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q30623",
  //   "subjectLabel": "Manchukuo",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Manchukuo.svg"
  // },
  // {
  //   "flag": "Q877603",
  //   "flagLabel": "flag of the Armenian Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q132856",
  //   "subjectLabel": "Armenian Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Armenian%20Soviet%20Socialist%20Republic%20%281952%E2%80%931990%29.svg"
  // },
  // {
  //   "flag": "Q913583",
  //   "flagLabel": "flag of the Confederate States",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q81931",
  //   "subjectLabel": "Confederate States of America",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Confederate%20States%20of%20America%20%281861%E2%80%931863%29.svg"
  // },
  // {
  //   "flag": "Q1073388",
  //   "flagLabel": "flag of Nazi Germany",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q7318",
  //   "subjectLabel": "Nazi Germany",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Germany%20%281933%E2%80%931935%29.svg"
  // },
  // {
  //   "flag": "Q1073388",
  //   "flagLabel": "flag of Nazi Germany",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q7318",
  //   "subjectLabel": "Nazi Germany",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Germany%20%281935%E2%80%931945%29.svg"
  // },
  // {
  //   "flag": "Q1426549",
  //   "flagLabel": "flag of the Kalmar Union",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q62623",
  //   "subjectLabel": "Kalmar Union",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Kalmar%20Union.svg"
  // },
  // {
  //   "flag": "Q1528478",
  //   "flagLabel": "flag of the Natalia Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1029847",
  //   "subjectLabel": "Natalia Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Natalia%20Republic.svg"
  // },
  // {
  //   "flag": "Q1995679",
  //   "flagLabel": "flag of Kuban",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1778994",
  //   "subjectLabel": "Kuban People's Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kuban%20People%27s%20Republic.svg"
  // },
  // {
  //   "flag": "Q4487062",
  //   "flagLabel": "Flag of Albania (1946–1992)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q467864",
  //   "subjectLabel": "People's Socialist Republic of Albania",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Albania%20%281946%E2%80%931992%29.svg"
  // },
  // {
  //   "flag": "Q10904482",
  //   "flagLabel": "18-Star Flag",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q13426199",
  //   "subjectLabel": "Republic of China (1912–1949)",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Chinese-army%20Wuhan%20flag%20%281911-1928%29%2018%20dots.svg"
  // },
  // {
  //   "flag": "Q21661961",
  //   "flagLabel": "Flag of the Bukharan People's Soviet Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q68682",
  //   "subjectLabel": "Bukharan People's Soviet Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Bukharan%20People%27s%20Soviet%20Republic.svg"
  // },
  // {
  //   "flag": "Q24577771",
  //   "flagLabel": "flag of the People's Republic of Benin",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q862701",
  //   "subjectLabel": "People's Republic of Benin",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Benin%20%281975%E2%80%931990%29.svg"
  // },
  // {
  //   "flag": "Q24577771",
  //   "flagLabel": "flag of the People's Republic of Benin",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q962",
  //   "subjectLabel": "Benin",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Benin%20%281975%E2%80%931990%29.svg"
  // },
  // {
  //   "flag": "Q24701074",
  //   "flagLabel": "flag of the Russian Soviet Federative Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2184",
  //   "subjectLabel": "Russian Soviet Federative Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Russian%20Soviet%20Federative%20Socialist%20Republic%20%281918%E2%80%931937%29.svg"
  // },
  // {
  //   "flag": "Q26236277",
  //   "flagLabel": "flag of Talossa",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2353425",
  //   "subjectLabel": "Talossa",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Kingdom%20of%20Talossa.svg"
  // },
  // {
  //   "flag": "Q28828989",
  //   "flagLabel": "flag of Afghanistan (1996-1997)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q427941",
  //   "subjectLabel": "Islamic Emirate of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Taliban%20%28original%29.svg"
  // },
  // {
  //   "flag": "Q28829393",
  //   "flagLabel": "flag of Afghanistan (1929–1930)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1138904",
  //   "subjectLabel": "Kingdom of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281929%E2%80%931931%29.svg"
  // },
  // {
  //   "flag": "Q28829402",
  //   "flagLabel": "flag of Afghanistan (1974–1978)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1415128",
  //   "subjectLabel": "Republic of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281974%E2%80%931978%29.svg"
  // },
  // {
  //   "flag": "Q28829400",
  //   "flagLabel": "flag of Afghanistan (1973–1974)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1415128",
  //   "subjectLabel": "Republic of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281973%E2%80%931974%29.svg"
  // },
  // {
  //   "flag": "Q28829409",
  //   "flagLabel": "flag of Afghanistan (1978–1980)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q476757",
  //   "subjectLabel": "Democratic Republic of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281978%E2%80%931980%29.svg"
  // },
  // {
  //   "flag": "Q28829428",
  //   "flagLabel": "flag of Afghanistan (1992–1996)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1415585",
  //   "subjectLabel": "Islamic State of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281992%E2%80%932001%29.svg"
  // },
  // {
  //   "flag": "Q28829442",
  //   "flagLabel": "flag of Afghanistan (2001–2002)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1415585",
  //   "subjectLabel": "Islamic State of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%282001%E2%80%932002%29.svg"
  // },
  // {
  //   "flag": "Q29884223",
  //   "flagLabel": "flag of Weihaiwei",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q15939896",
  //   "subjectLabel": "Weihaiwei under British rule",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/British%20Weihaiwei%20flag.svg"
  // },
  // {
  //   "flag": "Q12188",
  //   "flagLabel": "flag of Brittany",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q12130",
  //   "subjectLabel": "Brittany",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Brittany.svg"
  // },
  // {
  //   "flag": "Q16611",
  //   "flagLabel": "flag of Russia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q159",
  //   "subjectLabel": "Russia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Russia.svg"
  // },
  // {
  //   "flag": "Q26491",
  //   "flagLabel": "flag of Georgia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q230",
  //   "subjectLabel": "Georgia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Georgia.svg"
  // },
  // {
  //   "flag": "Q33213",
  //   "flagLabel": "flag of Armenia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q399",
  //   "subjectLabel": "Armenia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Armenia.svg"
  // },
  // {
  //   "flag": "Q36005",
  //   "flagLabel": "flag of Lebanon",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q822",
  //   "subjectLabel": "Lebanon",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Lebanon.svg"
  // },
  // {
  //   "flag": "Q42436",
  //   "flagLabel": "flag of Poland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q36",
  //   "subjectLabel": "Poland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Poland.svg"
  // },
  // {
  //   "flag": "Q45136",
  //   "flagLabel": "Flag of Syria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q170468",
  //   "subjectLabel": "United Arab Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Syria.svg"
  // },
  // {
  //   "flag": "Q45136",
  //   "flagLabel": "Flag of Syria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q858",
  //   "subjectLabel": "Syria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Syria.svg"
  // },
  // {
  //   "flag": "Q46008",
  //   "flagLabel": "flag of Laos",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q819",
  //   "subjectLabel": "Laos",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Laos.svg"
  // },
  // {
  //   "flag": "Q124020",
  //   "flagLabel": "flag of Switzerland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q39",
  //   "subjectLabel": "Switzerland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Switzerland.svg"
  // },
  // {
  //   "flag": "Q133015",
  //   "flagLabel": "flag of Croatia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q224",
  //   "subjectLabel": "Croatia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Croatia.svg"
  // },
  // {
  //   "flag": "Q135014",
  //   "flagLabel": "flag of the Gambia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1005",
  //   "subjectLabel": "The Gambia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20The%20Gambia.svg"
  // },
  // {
  //   "flag": "Q148199",
  //   "flagLabel": "flag of Thuringia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1205",
  //   "subjectLabel": "Thuringia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Thuringia.svg"
  // },
  // {
  //   "flag": "Q159746",
  //   "flagLabel": "flag of Monaco",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q235",
  //   "subjectLabel": "Monaco",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Monaco.svg"
  // },
  // {
  //   "flag": "Q160255",
  //   "flagLabel": "flag of Peru",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q419",
  //   "subjectLabel": "Peru",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Peru.svg"
  // },
  // {
  //   "flag": "Q160861",
  //   "flagLabel": "flag of Slovakia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q214",
  //   "subjectLabel": "Slovakia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Slovakia.svg"
  // },
  // {
  //   "flag": "Q163008",
  //   "flagLabel": "flag of Cuba",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q241",
  //   "subjectLabel": "Cuba",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Cuba.svg"
  // },
  // {
  //   "flag": "Q165545",
  //   "flagLabel": "flag of Kuwait",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q817",
  //   "subjectLabel": "Kuwait",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kuwait.svg"
  // },
  // {
  //   "flag": "Q165872",
  //   "flagLabel": "flag of Brunei",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q921",
  //   "subjectLabel": "Brunei",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Brunei.svg"
  // },
  // {
  //   "flag": "Q169192",
  //   "flagLabel": "flag of Belize",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q242",
  //   "subjectLabel": "Belize",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Belize.svg"
  // },
  // {
  //   "flag": "Q170289",
  //   "flagLabel": "flag of Costa Rica",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q800",
  //   "subjectLabel": "Costa Rica",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Costa%20Rica%20%28state%29.svg"
  // },
  // {
  //   "flag": "Q170465",
  //   "flagLabel": "flag of Paraguay",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q733",
  //   "subjectLabel": "Paraguay",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Paraguay.svg"
  // },
  // {
  //   "flag": "Q180725",
  //   "flagLabel": "Flag of Suriname",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q730",
  //   "subjectLabel": "Suriname",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Suriname.svg"
  // },
  // {
  //   "flag": "Q182514",
  //   "flagLabel": "flag of Fiji",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q712",
  //   "subjectLabel": "Fiji",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Fiji.svg"
  // },
  // {
  //   "flag": "Q188477",
  //   "flagLabel": "flag of Samoa",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q683",
  //   "subjectLabel": "Samoa",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Samoa.svg"
  // },
  // {
  //   "flag": "Q199621",
  //   "flagLabel": "flag of Abkhazia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q31354462",
  //   "subjectLabel": "Republic of Abkhazia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Republic%20of%20Abkhazia.svg"
  // },
  // {
  //   "flag": "Q204120",
  //   "flagLabel": "flag of the British Virgin Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q25305",
  //   "subjectLabel": "British Virgin Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20British%20Virgin%20Islands.svg"
  // },
  // {
  //   "flag": "Q316128",
  //   "flagLabel": "black-white-red flag of Germany",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q150981",
  //   "subjectLabel": "North German Confederation",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Germany%20%281867%E2%80%931919%29.svg"
  // },
  // {
  //   "flag": "Q316128",
  //   "flagLabel": "black-white-red flag of Germany",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q43287",
  //   "subjectLabel": "German Empire",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Germany%20%281867%E2%80%931919%29.svg"
  // },
  // {
  //   "flag": "Q329280",
  //   "flagLabel": "flag of the British Indian Ocean Territory",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q43448",
  //   "subjectLabel": "British Indian Ocean Territory",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Commissioner%20of%20the%20British%20Indian%20Ocean%20Territory.svg"
  // },
  // {
  //   "flag": "Q381988",
  //   "flagLabel": "flag of Yugoslavia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q83286",
  //   "subjectLabel": "Socialist Federal Republic of Yugoslavia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Yugoslavia%20%281946-1992%29.svg"
  // },
  // {
  //   "flag": "Q523638",
  //   "flagLabel": "flag of Kalmykia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q3953",
  //   "subjectLabel": "Republic of Kalmykia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kalmykia.svg"
  // },
  // {
  //   "flag": "Q617649",
  //   "flagLabel": "flag of Wallonia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q231",
  //   "subjectLabel": "Wallonia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Wallonia.svg"
  // },
  // {
  //   "flag": "Q863816",
  //   "flagLabel": "flag of the Byelorussian Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2895",
  //   "subjectLabel": "Byelorussian Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Byelorussian%20Soviet%20Socialist%20Republic%20%281951%E2%80%931991%29.svg"
  // },
  // {
  //   "flag": "Q1048951",
  //   "flagLabel": "flag of the Georgian Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q130229",
  //   "subjectLabel": "Georgian Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Georgian%20Soviet%20Socialist%20Republic%20%281951%E2%80%931990%29.svg"
  // },
  // {
  //   "flag": "Q1740429",
  //   "flagLabel": "flag of South Vietnam",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2657969",
  //   "subjectLabel": "Vietnamese American",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Vietnam.svg"
  // },
  // {
  //   "flag": "Q1740429",
  //   "flagLabel": "flag of South Vietnam",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q881",
  //   "subjectLabel": "Vietnam",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Vietnam.svg"
  // },
  // {
  //   "flag": "Q1740429",
  //   "flagLabel": "flag of South Vietnam",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q10800567",
  //   "subjectLabel": "Vietnamese Australian",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Vietnam.svg"
  // },
  // {
  //   "flag": "Q1740429",
  //   "flagLabel": "flag of South Vietnam",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q10800511",
  //   "subjectLabel": "Vietnamese Canadians",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Vietnam.svg"
  // },
  // {
  //   "flag": "Q1907209",
  //   "flagLabel": "flags of the Ottoman Empire",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q12560",
  //   "subjectLabel": "Ottoman Empire",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Ottoman%20Empire%20%281844%E2%80%931922%29.svg"
  // },
  // {
  //   "flag": "Q2290109",
  //   "flagLabel": "flag of the West Indies Federation",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q652560",
  //   "subjectLabel": "West Indies Federation",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Naval%20Ensign%20of%20the%20West%20Indies%20Federation%20%281958%E2%80%931962%29.svg"
  // },
  // {
  //   "flag": "Q2290109",
  //   "flagLabel": "flag of the West Indies Federation",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q652560",
  //   "subjectLabel": "West Indies Federation",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20West%20Indies%20Federation%20%281958%E2%80%931962%29.svg"
  // },
  // {
  //   "flag": "Q7624391",
  //   "flagLabel": "flag of the German Democratic Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q16957",
  //   "subjectLabel": "German Democratic Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20East%20Germany.svg"
  // },
  // {
  //   "flag": "Q11907841",
  //   "flagLabel": "Flag of Buganda",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q473748",
  //   "subjectLabel": "Buganda",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Buganda.svg"
  // },
  // {
  //   "flag": "Q12741385",
  //   "flagLabel": "flag of Moldavia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q10957559",
  //   "subjectLabel": "Principality of Moldavia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Moldavia.svg"
  // },
  // {
  //   "flag": "Q15962374",
  //   "flagLabel": "flag of the German Empire",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q43287",
  //   "subjectLabel": "German Empire",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Germany%20%281867%E2%80%931919%29.svg"
  // },
  // {
  //   "flag": "Q17622301",
  //   "flagLabel": "flag of the Islamic State of Iraq and the Levant",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2429253",
  //   "subjectLabel": "Islamic State of Iraq and the Levant",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Islamic%20State%20of%20Iraq%20and%20the%20Levant2.svg"
  // },
  // {
  //   "flag": "Q27966457",
  //   "flagLabel": "flag of Czechoslovakia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q33946",
  //   "subjectLabel": "Czechoslovakia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Czech%20Republic.svg"
  // },
  // {
  //   "flag": "Q28829381",
  //   "flagLabel": "flag of Afghanistan (1926–1928)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1138904",
  //   "subjectLabel": "Kingdom of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281926%E2%80%931928%29.svg"
  // },
  // {
  //   "flag": "Q28829406",
  //   "flagLabel": "flag of Afghanistan (1978)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q476757",
  //   "subjectLabel": "Democratic Republic of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281978%29.svg"
  // },
  // {
  //   "flag": "Q28829414",
  //   "flagLabel": "flag of Afghanistan (1980–1987)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q476757",
  //   "subjectLabel": "Democratic Republic of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281980%E2%80%931987%29.svg"
  // },
  // {
  //   "flag": "Q54356648",
  //   "flagLabel": "flag of the Autonomous Republic of Northern Epirus",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q730163",
  //   "subjectLabel": "Autonomous Republic of Northern Epirus",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Autonomous%20Republic%20of%20Northern%20Epirus.svg"
  // },
  // {
  //   "flag": "Q60521346",
  //   "flagLabel": "flag of the Chuvash Autonomous Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1253541",
  //   "subjectLabel": "Chuvash Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Chuvash%20ASSR.svg"
  // },
  // {
  //   "flag": "Q60521347",
  //   "flagLabel": "flag of the Kabardino-Balkar Autonomous Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q788875",
  //   "subjectLabel": "Kabardino-Balkar Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Kabardino-Balkar%20ASSR.svg"
  // },
  // {
  //   "flag": "Q60521350",
  //   "flagLabel": "flag of the Mari Autonomous Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q788066",
  //   "subjectLabel": "Mari Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mari%20ASSR.svg"
  // },
  // {
  //   "flag": "Q60521348",
  //   "flagLabel": "flag of the Karakalpak Autonomous Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q429797",
  //   "subjectLabel": "Karakalpak Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Karakalpak%20ASSR.svg"
  // },
  // {
  //   "flag": "Q60521354",
  //   "flagLabel": "flag of the Udmurt Autonomous Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1429298",
  //   "subjectLabel": "Udmurt Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Udmurt%20ASSR.svg"
  // },
  // {
  //   "flag": "Q60521353",
  //   "flagLabel": "flag of the North Ossetian Autonomous Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1816542",
  //   "subjectLabel": "North Ossetian Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20North%20Ossetian%20ASSR.svg"
  // },
  // {
  //   "flag": "Q60521356",
  //   "flagLabel": "flag of the Yakut Autonomous Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q175755",
  //   "subjectLabel": "Yakut Autonomous Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Yakut%20ASSR.svg"
  // },
  // {
  //   "flag": "Q97490422",
  //   "flagLabel": "flag of the Conch Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1123960",
  //   "subjectLabel": "Conch Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Key%20West%2C%20Florida.svg"
  // },
  // {
  //   "flag": "Q97522679",
  //   "flagLabel": "flag of West Florida",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q13258120",
  //   "subjectLabel": "Republic of West Florida",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/West%20Florida%20Flag.svg"
  // },
  // {
  //   "flag": "Q97750846",
  //   "flagLabel": "state flag of Peru",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q3649429",
  //   "subjectLabel": "Government of Peru",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Peru%20%28state%29.svg"
  // },
  // {
  //   "flag": "Q98153596",
  //   "flagLabel": "Todd's Bear Flag",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q17557",
  //   "subjectLabel": "California Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/1stBearFlag.svg"
  // },
  // {
  //   "flag": "Q81286",
  //   "flagLabel": "flag of Sweden",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q34",
  //   "subjectLabel": "Sweden",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Sweden.svg"
  // },
  // {
  //   "flag": "Q82194",
  //   "flagLabel": "flag of Brazil",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q155",
  //   "subjectLabel": "Brazil",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Brazil.svg"
  // },
  // {
  //   "flag": "Q82236",
  //   "flagLabel": "flag of Azerbaijan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q227",
  //   "subjectLabel": "Azerbaijan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Azerbaijan.svg"
  // },
  // {
  //   "flag": "Q93335",
  //   "flagLabel": "Flag of Iceland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q189",
  //   "subjectLabel": "Iceland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Iceland.svg"
  // },
  // {
  //   "flag": "Q102392",
  //   "flagLabel": "flag of Scotland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q22",
  //   "subjectLabel": "Scotland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Scotland.svg"
  // },
  // {
  //   "flag": "Q102944",
  //   "flagLabel": "flag of Cape Verde",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1011",
  //   "subjectLabel": "Cape Verde",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Cape%20Verde.svg"
  // },
  // {
  //   "flag": "Q102987",
  //   "flagLabel": "Flag of Haiti",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q790",
  //   "subjectLabel": "Haiti",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Haiti.svg"
  // },
  // {
  //   "flag": "Q103001",
  //   "flagLabel": "flag of Malawi",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1020",
  //   "subjectLabel": "Malawi",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Malawi.svg"
  // },
  // {
  //   "flag": "Q103019",
  //   "flagLabel": "flag of Madagascar",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1019",
  //   "subjectLabel": "Madagascar",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Madagascar.svg"
  // },
  // {
  //   "flag": "Q103037",
  //   "flagLabel": "Flag of Uganda",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1036",
  //   "subjectLabel": "Uganda",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Uganda.svg"
  // },
  // {
  //   "flag": "Q103046",
  //   "flagLabel": "flag of Niger",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1032",
  //   "subjectLabel": "Niger",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Niger.svg"
  // },
  // {
  //   "flag": "Q103070",
  //   "flagLabel": "flag of Togo",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q945",
  //   "subjectLabel": "Togo",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Togo.svg"
  // },
  // {
  //   "flag": "Q105643",
  //   "flagLabel": "flag of Tuvalu",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q672",
  //   "subjectLabel": "Tuvalu",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tuvalu.svg"
  // },
  // {
  //   "flag": "Q124329",
  //   "flagLabel": "flag of Angola",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q916",
  //   "subjectLabel": "Angola",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Angola.svg"
  // },
  // {
  //   "flag": "Q126622",
  //   "flagLabel": "flag of Iran",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q794",
  //   "subjectLabel": "Iran",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Iran.svg"
  // },
  // {
  //   "flag": "Q127296",
  //   "flagLabel": "flag of South Korea",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q884",
  //   "subjectLabel": "South Korea",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20South%20Korea.svg"
  // },
  // {
  //   "flag": "Q128812",
  //   "flagLabel": "flag of Portugal",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q45",
  //   "subjectLabel": "Portugal",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Portugal.svg"
  // },
  // {
  //   "flag": "Q129132",
  //   "flagLabel": "flag of Greece",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q41",
  //   "subjectLabel": "Greece",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Greece.svg"
  // },
  // {
  //   "flag": "Q130449",
  //   "flagLabel": "flag of Latvia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q211",
  //   "subjectLabel": "Latvia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Latvia.svg"
  // },
  // {
  //   "flag": "Q130481",
  //   "flagLabel": "flag of Bahrain",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q398",
  //   "subjectLabel": "Bahrain",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Bahrain.svg"
  // },
  // {
  //   "flag": "Q130807",
  //   "flagLabel": "Flag of Slovenia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q215",
  //   "subjectLabel": "Slovenia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Slovenia.svg"
  // },
  // {
  //   "flag": "Q130811",
  //   "flagLabel": "flag of Romania",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q218",
  //   "subjectLabel": "Romania",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Romania.svg"
  // },
  // {
  //   "flag": "Q131147",
  //   "flagLabel": "Flag of China",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q148",
  //   "subjectLabel": "People's Republic of China",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20People%27s%20Republic%20of%20China.svg"
  // },
  // {
  //   "flag": "Q132633",
  //   "flagLabel": "flag of Belarus",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q184",
  //   "subjectLabel": "Belarus",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Belarus.svg"
  // },
  // {
  //   "flag": "Q154823",
  //   "flagLabel": "flag of Sri Lanka",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q854",
  //   "subjectLabel": "Sri Lanka",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Sri%20Lanka.svg"
  // },
  // {
  //   "flag": "Q159872",
  //   "flagLabel": "flag of Cameroon",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1009",
  //   "subjectLabel": "Cameroon",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Cameroon.svg"
  // },
  // {
  //   "flag": "Q162033",
  //   "flagLabel": "flag of Bosnia and Herzegovina",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q225",
  //   "subjectLabel": "Bosnia and Herzegovina",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Bosnia%20and%20Herzegovina.svg"
  // },
  // {
  //   "flag": "Q163832",
  //   "flagLabel": "flag of Serbia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q403",
  //   "subjectLabel": "Serbia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Serbia.svg"
  // },
  // {
  //   "flag": "Q165641",
  //   "flagLabel": "flag of Kyrgyzstan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q813",
  //   "subjectLabel": "Kyrgyzstan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kyrgyzstan.svg"
  // },
  // {
  //   "flag": "Q167119",
  //   "flagLabel": "flag of North Macedonia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q221",
  //   "subjectLabel": "North Macedonia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20North%20Macedonia.svg"
  // },
  // {
  //   "flag": "Q167584",
  //   "flagLabel": "flag of Moldova",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q217",
  //   "subjectLabel": "Moldova",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Moldova.svg"
  // },
  // {
  //   "flag": "Q168711",
  //   "flagLabel": "flag of Kosovo",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1246",
  //   "subjectLabel": "Kosovo",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Kosovo.svg"
  // },
  // {
  //   "flag": "Q168917",
  //   "flagLabel": "flag of Comoros",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q970",
  //   "subjectLabel": "Comoros",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Comoros.svg"
  // },
  // {
  //   "flag": "Q169903",
  //   "flagLabel": "flag of Mali",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q912",
  //   "subjectLabel": "Mali",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mali.svg"
  // },
  // {
  //   "flag": "Q169907",
  //   "flagLabel": "flag of São Tomé and Príncipe",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1039",
  //   "subjectLabel": "São Tomé and Príncipe",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Sao%20Tome%20and%20Principe.svg"
  // },
  // {
  //   "flag": "Q170064",
  //   "flagLabel": "flag of Jordan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q810",
  //   "subjectLabel": "Jordan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Jordan.svg"
  // },
  // {
  //   "flag": "Q170554",
  //   "flagLabel": "flag of Equatorial Guinea",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q983",
  //   "subjectLabel": "Equatorial Guinea",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Equatorial%20Guinea.svg"
  // },
  // {
  //   "flag": "Q172530",
  //   "flagLabel": "Flag of Qatar",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q846",
  //   "subjectLabel": "Qatar",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Qatar.svg"
  // },
  // {
  //   "flag": "Q173535",
  //   "flagLabel": "flag of Taiwan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q865",
  //   "subjectLabel": "Taiwan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Republic%20of%20China.svg"
  // },
  // {
  //   "flag": "Q178179",
  //   "flagLabel": "flag of Guatemala",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q774",
  //   "subjectLabel": "Guatemala",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Guatemala.svg"
  // },
  // {
  //   "flag": "Q179383",
  //   "flagLabel": "flag of Dominica",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q784",
  //   "subjectLabel": "Dominica",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Dominica.svg"
  // },
  // {
  //   "flag": "Q184265",
  //   "flagLabel": "flag of Dominican Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q786",
  //   "subjectLabel": "Dominican Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Dominican%20Republic.svg"
  // },
  // {
  //   "flag": "Q184268",
  //   "flagLabel": "Flag of Greenland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q223",
  //   "subjectLabel": "Greenland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Greenland.svg"
  // },
  // {
  //   "flag": "Q185285",
  //   "flagLabel": "flag of Vanuatu",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q686",
  //   "subjectLabel": "Vanuatu",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Vanuatu.svg"
  // },
  // {
  //   "flag": "Q185692",
  //   "flagLabel": "flag of Wales",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q25",
  //   "subjectLabel": "Wales",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Wales%20%281959%E2%80%93present%29.svg"
  // },
  // {
  //   "flag": "Q186226",
  //   "flagLabel": "flag of the Isle of Man",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q9676",
  //   "subjectLabel": "Isle of Man",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Isle%20of%20Man.svg"
  // },
  // {
  //   "flag": "Q186456",
  //   "flagLabel": "flag of Hong Kong",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q8646",
  //   "subjectLabel": "Hong Kong",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Hong%20Kong.svg"
  // },
  // {
  //   "flag": "Q199961",
  //   "flagLabel": "flag of Transnistria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q907112",
  //   "subjectLabel": "Transnistria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Transnistria%20%28state%29.svg"
  // },
  // {
  //   "flag": "Q328895",
  //   "flagLabel": "flag of the Cocos (Keeling) Islands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q36004",
  //   "subjectLabel": "Cocos (Keeling) Islands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Cocos%20%28Keeling%29%20Islands.svg"
  // },
  // {
  //   "flag": "Q336328",
  //   "flagLabel": "flag of Christmas Island",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q31063",
  //   "subjectLabel": "Christmas Island",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Christmas%20Island.svg"
  // },
  // {
  //   "flag": "Q369618",
  //   "flagLabel": "flag of Shetland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q22",
  //   "subjectLabel": "Scotland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Shetland.svg"
  // },
  // {
  //   "flag": "Q375554",
  //   "flagLabel": "flag of the Sahrawi Arab Democratic Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q40362",
  //   "subjectLabel": "Sahrawi Arab Democratic Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Sahrawi%20Arab%20Democratic%20Republic.svg"
  // },
  // {
  //   "flag": "Q462918",
  //   "flagLabel": "flag of Vojvodina",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q44749",
  //   "subjectLabel": "Vojvodina",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Vojvodina.svg"
  // },
  // {
  //   "flag": "Q483659",
  //   "flagLabel": "Flag of Singapore",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q334",
  //   "subjectLabel": "Singapore",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Singapore.svg"
  // },
  // {
  //   "flag": "Q483774",
  //   "flagLabel": "flag of Uzbekistan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q265",
  //   "subjectLabel": "Uzbekistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Uzbekistan.svg"
  // },
  // {
  //   "flag": "Q558375",
  //   "flagLabel": "flag of Brandenburg",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1208",
  //   "subjectLabel": "Brandenburg",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Brandenburg.svg"
  // },
  // {
  //   "flag": "Q594095",
  //   "flagLabel": "flag of Sverdlovsk Oblast",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5462",
  //   "subjectLabel": "Sverdlovsk Oblast",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Sverdlovsk%20Oblast.svg"
  // },
  // {
  //   "flag": "Q601206",
  //   "flagLabel": "flag of Tuva",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q960",
  //   "subjectLabel": "Tuva Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tuva.svg"
  // },
  // {
  //   "flag": "Q609337",
  //   "flagLabel": "flag of Chechnya",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5187",
  //   "subjectLabel": "Chechen Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Chechen%20Republic.svg"
  // },
  // {
  //   "flag": "Q658355",
  //   "flagLabel": "flag of Tyumen Oblast",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5824",
  //   "subjectLabel": "Tyumen Oblast",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tyumen%20Oblast.svg"
  // },
  // {
  //   "flag": "Q818665",
  //   "flagLabel": "flag of Tristan da Cunha",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q220982",
  //   "subjectLabel": "Tristan da Cunha",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Tristan%20da%20Cunha.svg"
  // },
  // {
  //   "flag": "Q933011",
  //   "flagLabel": "flag of the Valencian Community",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q5720",
  //   "subjectLabel": "Community of Valencia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Land%20of%20Valencia%20%28official%29.svg"
  // },
  // {
  //   "flag": "Q2470827",
  //   "flagLabel": "flag of Sikkim",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1505",
  //   "subjectLabel": "Sikkim",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Sikkim%20%281967-1975%29.svg"
  // },
  // {
  //   "flag": "Q2483300",
  //   "flagLabel": "flag of the Kingdom of Etruria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q223793",
  //   "subjectLabel": "Kingdom of Etruria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Kingdom%20of%20Etruria.svg"
  // },
  // {
  //   "flag": "Q3039133",
  //   "flagLabel": "flag of Rhodesia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q217169",
  //   "subjectLabel": "Rhodesia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Rhodesia%20%281968%E2%80%931979%29.svg"
  // },
  // {
  //   "flag": "Q4485721",
  //   "flagLabel": "flag of the Weimar Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q41304",
  //   "subjectLabel": "Weimar Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Germany%20%283-2%20aspect%20ratio%29.svg"
  // },
  // {
  //   "flag": "Q4485865",
  //   "flagLabel": "Flag of Don Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2453974",
  //   "subjectLabel": "Don Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Don%20Cossacks.svg"
  // },
  // {
  //   "flag": "Q4485922",
  //   "flagLabel": "Flag of Republic of Genova",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q174306",
  //   "subjectLabel": "Republic of Genova",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Genoa.svg"
  // },
  // {
  //   "flag": "Q4487040",
  //   "flagLabel": "Flag of Mengjiang",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q697837",
  //   "subjectLabel": "Mengjiang",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Mengjiang.svg"
  // },
  // {
  //   "flag": "Q4490584",
  //   "flagLabel": "Q4490584",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q42418",
  //   "subjectLabel": "Taliban",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Taliban.svg"
  // },
  // {
  //   "flag": "Q11698203",
  //   "flagLabel": "flag of the Kingdom of Italy (1805-1814)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q223936",
  //   "subjectLabel": "Kingdom of Italy",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Napoleonic%20Kingdom%20of%20Italy.svg"
  // },
  // {
  //   "flag": "Q11908040",
  //   "flagLabel": "Flag of British Somaliland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q662653",
  //   "subjectLabel": "British Somaliland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20British%20Somaliland%20%281950%E2%80%931952%29.svg"
  // },
  // {
  //   "flag": "Q12727038",
  //   "flagLabel": "Flag of the Moldavian Democratic Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q964024",
  //   "subjectLabel": "Moldavian Democratic Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/%D0%A4%D0%BB%D0%B0%D0%B3%20%D0%9C%D0%BE%D0%BB%D0%B4%D0%B0%D0%B2%D1%81%D0%BA%D0%BE%D0%B9%20%D0%B4%D0%B5%D0%BC%D0%BE%D0%BA%D1%80%D0%B0%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B9%20%D1%80%D0%B5%D1%81%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B8.svg"
  // },
  // {
  //   "flag": "Q12751886",
  //   "flagLabel": "Flag of the Free State of Fiume",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q548114",
  //   "subjectLabel": "Free State of Fiume",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Free%20State%20of%20Fiume.svg"
  // },
  // {
  //   "flag": "Q15872907",
  //   "flagLabel": "flag of the Batavian Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q188553",
  //   "subjectLabel": "Batavian Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Bataafse%20Republiek%20nationale%20vlag.svg"
  // },
  // {
  //   "flag": "Q16630026",
  //   "flagLabel": "Flag of the Kingdom of Araucanía and Patagonia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q271570",
  //   "subjectLabel": "Kingdom of Araucanía and Patagonia",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Kingdom%20of%20Araucan%C3%ADa%20and%20Patagonia.svg"
  // },
  // {
  //   "flag": "Q24701084",
  //   "flagLabel": "flag of the Russian Soviet Federative Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2184",
  //   "subjectLabel": "Russian Soviet Federative Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Russia%20%281991%E2%80%931993%29.svg"
  // },
  // {
  //   "flag": "Q28828255",
  //   "flagLabel": "flag of Libya (1977–2011)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1016",
  //   "subjectLabel": "Libya",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Libya%20%281977%E2%80%932011%29.svg"
  // },
  // {
  //   "flag": "Q28829363",
  //   "flagLabel": "flag of Afghanistan (1901–1919)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1335260",
  //   "subjectLabel": "Emirate of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281901%E2%80%931919%29.svg"
  // },
  // {
  //   "flag": "Q28829390",
  //   "flagLabel": "flag of Afghanistan (1929)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1138904",
  //   "subjectLabel": "Kingdom of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281929%29.svg"
  // },
  // {
  //   "flag": "Q28829396",
  //   "flagLabel": "flag of Afghanistan (1930–1973)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1138904",
  //   "subjectLabel": "Kingdom of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281931%E2%80%931973%29.svg"
  // },
  // {
  //   "flag": "Q28829418",
  //   "flagLabel": "flag of Afghanistan (1987–1992)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1415128",
  //   "subjectLabel": "Republic of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281987%E2%80%931992%29.svg"
  // },
  // {
  //   "flag": "Q28829423",
  //   "flagLabel": "flag of Afghanistan (1992)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1415585",
  //   "subjectLabel": "Islamic State of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%281992%29.svg"
  // },
  // {
  //   "flag": "Q28829447",
  //   "flagLabel": "flag of Afghanistan (2002–2004)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1415585",
  //   "subjectLabel": "Islamic State of Afghanistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Afghanistan%20%282002%E2%80%932004%29.svg"
  // },
  // {
  //   "flag": "Q52010602",
  //   "flagLabel": "flag of the President of Azerbaijan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q227",
  //   "subjectLabel": "Azerbaijan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20President%20of%20Azerbaijan.svg"
  // },
  // {
  //   "flag": "Q30768",
  //   "flagLabel": "flag of East Timor",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q574",
  //   "subjectLabel": "East Timor",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20East%20Timor.svg"
  // },
  // {
  //   "flag": "Q34599",
  //   "flagLabel": "flag of Libya",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1016",
  //   "subjectLabel": "Libya",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Libya.svg"
  // },
  // {
  //   "flag": "Q42537",
  //   "flagLabel": "flag of the United States",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q30",
  //   "subjectLabel": "United States of America",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20States%20%281891%E2%80%931896%29.svg"
  // },
  // {
  //   "flag": "Q42537",
  //   "flagLabel": "flag of the United States",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q30",
  //   "subjectLabel": "United States of America",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20States%20%281890-1891%29.svg"
  // },
  // {
  //   "flag": "Q42537",
  //   "flagLabel": "flag of the United States",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q30",
  //   "subjectLabel": "United States of America",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20States%20%281896%E2%80%931908%29.svg"
  // },
  // {
  //   "flag": "Q42537",
  //   "flagLabel": "flag of the United States",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q30",
  //   "subjectLabel": "United States of America",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/US%20flag%2049%20stars.svg"
  // },
  // {
  //   "flag": "Q42537",
  //   "flagLabel": "flag of the United States",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q30",
  //   "subjectLabel": "United States of America",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20States%20%281912-1959%29.svg"
  // },
  // {
  //   "flag": "Q42537",
  //   "flagLabel": "flag of the United States",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q30",
  //   "subjectLabel": "United States of America",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20United%20States%20%281908%E2%80%931912%29.svg"
  // },
  // {
  //   "flag": "Q43192",
  //   "flagLabel": "flag of France",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q142",
  //   "subjectLabel": "France",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20France.svg"
  // },
  // {
  //   "flag": "Q47214",
  //   "flagLabel": "flag of the Russian Soviet Federative Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q2184",
  //   "subjectLabel": "Russian Soviet Federative Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Russian%20Soviet%20Federative%20Socialist%20Republic%20%281954%E2%80%931991%29.svg"
  // },
  // {
  //   "flag": "Q48160",
  //   "flagLabel": "flag of Germany",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q183",
  //   "subjectLabel": "Germany",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Germany.svg"
  // },
  // {
  //   "flag": "Q48409",
  //   "flagLabel": "flag of Albania",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q222",
  //   "subjectLabel": "Albania",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Albania.svg"
  // },
  // {
  //   "flag": "Q4633",
  //   "flagLabel": "flag of Cyprus",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q229",
  //   "subjectLabel": "Cyprus",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Cyprus.svg"
  // },
  // {
  //   "flag": "Q12990",
  //   "flagLabel": "flag of Belgium",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q31",
  //   "subjectLabel": "Belgium",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Belgium%20%28civil%29.svg"
  // },
  // {
  //   "flag": "Q29074",
  //   "flagLabel": "flag of the Latvian Soviet Socialist Republic",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q192180",
  //   "subjectLabel": "Latvian Soviet Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Latvian%20Soviet%20Socialist%20Republic%20%281953%E2%80%931990%29.svg"
  // },
  // {
  //   "flag": "Q33037",
  //   "flagLabel": "flag of Gibraltar",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1410",
  //   "subjectLabel": "Gibraltar",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Gibraltar.svg"
  // },
  // {
  //   "flag": "Q41327",
  //   "flagLabel": "flag of Turkmenistan",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q874",
  //   "subjectLabel": "Turkmenistan",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Turkmenistan.svg"
  // },
  // {
  //   "flag": "Q41673",
  //   "flagLabel": "flag of India",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q668",
  //   "subjectLabel": "India",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20India.svg"
  // },
  // {
  //   "flag": "Q42876",
  //   "flagLabel": "flag of Italy",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q38",
  //   "subjectLabel": "Italy",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Italy.svg"
  // },
  // {
  //   "flag": "Q46585",
  //   "flagLabel": "flag of the Netherlands",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q55",
  //   "subjectLabel": "Netherlands",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Netherlands.svg"
  // },
  // {
  //   "flag": "Q46835",
  //   "flagLabel": "flag of Austria",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q40",
  //   "subjectLabel": "Austria",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Austria.svg"
  // },
  // {
  //   "flag": "Q47891",
  //   "flagLabel": "flag of Finland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q33",
  //   "subjectLabel": "Finland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Finland.svg"
  // },
  // {
  //   "flag": "Q102184",
  //   "flagLabel": "flag of Djibouti",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q977",
  //   "subjectLabel": "Djibouti"
  // },
  // {
  //   "flag": "Q102939",
  //   "flagLabel": "la bandera de Honduras",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q783",
  //   "subjectLabel": "Honduras"
  // },
  // {
  //   "flag": "Q165500",
  //   "flagLabel": "flag of Guinea",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q1006",
  //   "subjectLabel": "Guinea"
  // },
  // {
  //   "flag": "Q2335204",
  //   "flagLabel": "Star of India",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q129286",
  //   "subjectLabel": "British India"
  // },
  // {
  //   "flag": "Q3633948",
  //   "flagLabel": "flag of Duchy of Modena and Reggio",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q252580",
  //   "subjectLabel": "Duchy of Modena and Reggio"
  // },
  // {
  //   "flag": "Q3633966",
  //   "flagLabel": "flag of French Indochina",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q185682",
  //   "subjectLabel": "French Indochina"
  // },
  // {
  //   "flag": "Q4488240",
  //   "flagLabel": "Flag of the Federation of Rhodesia and Nyasaland",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q654342",
  //   "subjectLabel": "Federation of Rhodesia and Nyasaland"
  // },
  // {
  //   "flag": "Q15924652",
  //   "flagLabel": "flag of Formosa",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q319881",
  //   "subjectLabel": "Republic of Formosa"
  // },
  // {
  //   "flag": "Q20894439",
  //   "flagLabel": "Flag of Kingdom of Galicia",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q303421",
  //   "subjectLabel": "Kingdom of Galicia"
  // },
  // {
  //   "flag": "Q28828731",
  //   "flagLabel": "flag of Fujairah (1902-1952)",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q4091",
  //   "subjectLabel": "Fujairah"
  // },
  // {
  //   "flag": "Q85955953",
  //   "flagLabel": "flag of the pays de Léon",
  //   "class": "Q186516",
  //   "type": "national",
  //   "subject": "Q12178",
  //   "subjectLabel": "Pays de Léon"
  // },
  // {
  //   "flag": "Q24701080",
  //   "flagLabel": "flag of the Russian Soviet Federative Socialist Republic",
  //   "class": "Q22807280",
  //   "type": "regional",
  //   "subject": "Q2184",
  //   "subjectLabel": "Russian Soviet Federative Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Russian%20Soviet%20Federative%20Socialist%20Republic%20%281937%E2%80%931954%29.svg"
  // },
  // {
  //   "flag": "Q171117",
  //   "flagLabel": "flag of England",
  //   "class": "Q22807280",
  //   "type": "regional",
  //   "subject": "Q21",
  //   "subjectLabel": "England",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20England.svg"
  // },
  // {
  //   "flag": "Q24701074",
  //   "flagLabel": "flag of the Russian Soviet Federative Socialist Republic",
  //   "class": "Q22807280",
  //   "type": "regional",
  //   "subject": "Q2184",
  //   "subjectLabel": "Russian Soviet Federative Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Russian%20Soviet%20Federative%20Socialist%20Republic%20%281918%E2%80%931937%29.svg"
  // },
  // {
  //   "flag": "Q102392",
  //   "flagLabel": "flag of Scotland",
  //   "class": "Q22807280",
  //   "type": "regional",
  //   "subject": "Q22",
  //   "subjectLabel": "Scotland",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Scotland.svg"
  // },
  // {
  //   "flag": "Q185692",
  //   "flagLabel": "flag of Wales",
  //   "class": "Q22807280",
  //   "type": "regional",
  //   "subject": "Q25",
  //   "subjectLabel": "Wales",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Wales%20%281959%E2%80%93present%29.svg"
  // },
  // {
  //   "flag": "Q24701084",
  //   "flagLabel": "flag of the Russian Soviet Federative Socialist Republic",
  //   "class": "Q22807280",
  //   "type": "regional",
  //   "subject": "Q2184",
  //   "subjectLabel": "Russian Soviet Federative Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Russia%20%281991%E2%80%931993%29.svg"
  // },
  // {
  //   "flag": "Q47214",
  //   "flagLabel": "flag of the Russian Soviet Federative Socialist Republic",
  //   "class": "Q22807280",
  //   "type": "regional",
  //   "subject": "Q2184",
  //   "subjectLabel": "Russian Soviet Federative Socialist Republic",
  //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20the%20Russian%20Soviet%20Federative%20Socialist%20Republic%20%281954%E2%80%931991%29.svg"
  // }
];



// We use LocationConflation for validating and processing the locationSets
const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

console.log(colors.blue('-'.repeat(70)));
console.log(colors.blue('🗂   Build index'));
console.log(colors.blue('-'.repeat(70)));

let _config = {};
loadConfig();

let _collected = {};
loadCollected();

let _discard = {};
let _keep = {};
runFilters();

let _cache = {};
loadIndex();

checkItems('brands');
checkItems('flags');
checkItems('operators');
checkItems('transit');

mergeItems();

saveIndex();
console.log('');



//
// Load, validate, cleanup config files
//
function loadConfig() {
  ['trees', 'replacements', 'genericWords'].forEach(which => {
    const schema = require(`../schema/${which}.json`);
    const file = `config/${which}.json`;
    const contents = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    // check JSON schema
    validate(file, data, schema);

    // Clean and sort the files for consistency, save them that way.
    if (which === 'trees') {
      Object.keys(data.trees).forEach(t => {
        let tree = data.trees[t];
        let cleaned = {
          emoji:      tree.emoji,
          mainTag:    tree.mainTag,
          keepKV:     tree.keepKV.map(s => s.toLowerCase()).sort(),
          discardKVN: tree.discardKVN.map(s => s.toLowerCase()).sort()
        };
        tree = cleaned;
      });

    } else if (which === 'replacements') {
      Object.keys(data.replacements).forEach(qid => {
        let replacement = data.replacements[qid];
        let cleaned = {
          note:      replacement.note,
          wikidata:  replacement.wikidata,
          wikipedia: replacement.wikipedia
        };
        replacement = cleaned;
      });

    } else if (which === 'genericWords') {
      data.genericWords = data.genericWords.map(s => s.toLowerCase()).sort();
    }

    // Lowercase and sort the files for consistency, save them that way.
    fs.writeFileSync(file, stringify(sort(data)));

    _config[which] = data[which];
  });
}


//
// Load lists of tags collected from OSM from `dist/collected/*`
//
function loadCollected() {
  ['name', 'brand', 'operator', 'network'].forEach(tag => {
    const file = `dist/collected/${tag}s_all.json`;
    const contents = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    _collected[tag] = data;
  });
}


//
// Filter the tags collected into _keep and _discard lists
//
function runFilters() {
  const START = '🏗   ' + colors.yellow(`Filtering values gathered from OSM...`);
  const END = '👍  ' + colors.green(`done filtering`);
  console.log('');
  console.log(START);
  console.time(END);

  // which trees use which tags?
  // note, 'flags' not seeded with collected data (yet?)
  const treeTags = {
    brands:     ['brand', 'name'],
    operators:  ['operator'],
    transit:    ['network']
  };

  Object.keys(treeTags).forEach(t => {
    const tree = _config.trees[t];
    let discard = _discard[t] = {};
    let keep = _keep[t] = {};

    // Start clean
    shell.rm('-f', [`dist/filtered/${t}_keep.json`, `dist/filtered/${t}_discard.json`]);

    // All the collected values start out in discard..
    treeTags[t].forEach(tag => {
      let collected = _collected[tag];
      for (const kvn in collected) {
        discard[kvn] = Math.max((discard[kvn] || 0), collected[kvn]);
      }
    });

    // Filter by keepKV (move from discard -> keep)
    tree.keepKV.forEach(s => {
      const re = new RegExp(s, 'i');
      for (const kvn in discard) {
        const kv = kvn.split('|', 2)[0];
        if (re.test(kv)) {
          keep[kvn] = discard[kvn];
          delete discard[kvn];
        }
      }
    });

    // Filter by discardKeys (move from keep -> discard)
    tree.discardKVN.forEach(s => {
      const re = new RegExp(s, 'i');
      for (const kvn in keep) {
        if (re.test(kvn)) {
          discard[kvn] = keep[kvn];
          delete keep[kvn];
        }
      }
    });

    // filter by discardNames (move from keep -> discard)
    _config.genericWords.forEach(s => {
      const re = new RegExp(s, 'i');
      for (let kvn in keep) {
        const name = kvn.split('|', 2)[1];
        if (re.test(name) || /;/.test(name)) {  // also discard values with semicolons
          discard[kvn] = keep[kvn];
          delete keep[kvn];
        }
      }
    });

    const discardCount = Object.keys(discard).length;
    const keepCount = Object.keys(keep).length;
    console.log(`${tree.emoji}  ${t}:\t${keepCount} keep, ${discardCount} discard`);

    fs.writeFileSync(`dist/filtered/${t}_discard.json`, stringify(sort(discard)));
    fs.writeFileSync(`dist/filtered/${t}_keep.json`, stringify(sort(keep)));

  });

  console.timeEnd(END);
}


//
// Load the index files under `data/*`
//
function loadIndex() {
  const START = '🏗   ' + colors.yellow(`Loading index files...`);
  const END = '👍  ' + colors.green(`done loading`);
  console.log('');
  console.log(START);
  console.time(END);

  fileTree.read(_cache, loco);
  matcher.buildMatchIndex(_cache.path, loco);

  // It takes a while to resolve all of the locationSets into GeoJSON and insert into which-polygon
  // We don't need a location index for this script, but it's useful to know.
  //  matcher.buildLocationIndex(_cache.path, loco);

  console.timeEnd(END);
}


//
// Save the updated index files under `data/*`
//
function saveIndex() {
  const START = '🏗   ' + colors.yellow(`Saving index files...`);
  const END = '👍  ' + colors.green(`done saving`);
  console.log('');
  console.log(START);
  console.time(END);

  fileTree.write(_cache);

  console.timeEnd(END);
}


//
// mergeItems()
// Iterate over the names we are keeping and:
// - insert anything "new" (i.e. not matched by the matcher).
// - update all items to have whatever tags they should have.
//
function mergeItems() {
  const START = '🏗   ' + colors.yellow(`Merging items...`);
  const END = '👍  ' + colors.green(`done merging`);
  console.log('');
  console.log(START);
  console.time(END);


  Object.keys(_config.trees).forEach(t => {
    const tree = _config.trees[t];
    let total = 0;
    let totalNew = 0;

// LETS IMPORT THE FLAGS
if (t === 'flags') {
  _flagdata.forEach(f => {
    // {
    //   "flag": "Q122462",
    //   "flagLabel": "flag of Mexico",
    //   "class": "Q2067046",
    //   "subject": "Q96",
    //   "subjectLabel": "Mexico",
    //   "image": "http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Mexico.svg"
    // },
    const cc = CountryCoder.feature(f.subject);
    if (!cc || !cc.properties) return;   // not actually country-like
    const m = matcher.match('man_made', 'flagpole', cc.properties.nameEn);    // should match 'subject'
    if (m) return;     // already in the index

    // A new flag!
    let item = {
      displayName: cc.properties.nameEn,
      locationSet: {include: ['001']},
      tags: {
        'flag:name': f.subjectLabel,
        'flag:type': 'national',
        'flag:wikidata': f.flag,
        'man_made': 'flagpole',
        'subject': cc.properties.nameEn,
        'subject:wikidata': f.subject
      }
    };

    if (cc.properties.iso1A2) {
      item.tags.country = cc.properties.iso1A2;
    }
    // Insert into index..
    const tkv = `flags/man_made/flagpole`;
    if (!_cache.path[tkv])  _cache.path[tkv] = [];
    _cache.path[tkv].push(item);
    totalNew++;
  });
}


    //
    // INSERT - Look in `_keep` for new items not yet in the tree..
    //
    const keeping = _keep[t] || {};
    Object.keys(keeping).forEach(kvn => {
      const parts = kvn.split('|', 2);     // kvn = "key/value|name"
      const kv = parts[0];
      const n = parts[1];
      const parts2 = kv.split('/', 2);
      const k = parts2[0];
      const v = parts2[1];
      const tkv = `${t}/${k}/${v}`;

      const m = matcher.match(k, v, n);
      if (m) return;     // already in the index

      // A new item!
      let item = { tags: {} };
      item.displayName = n;
      item.locationSet = { include: ['001'] };   // the whole world
      item.tags[k] = v;     // assign default tag k=v

      // Perform tree-specific tag defaults here..
      if (t === 'brands') {
        item.tags.brand = n;
        item.tags.name = n;

      } else if (t === 'operators') {
        item.tags.operator = n;

      } else if (t === 'transit') {
        item.tags.network = n;
        item.tags.operator = n;
      }

      // Insert into index..
      if (!_cache.path[tkv])  _cache.path[tkv] = [];
      _cache.path[tkv].push(item);
      totalNew++;
    });


    //
    // UPDATE - Check all items in the tree for expected tags..
    //
    const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === t);
    paths.forEach(tkv => {
      let items = _cache.path[tkv];
      if (!Array.isArray(items) || !items.length) return;

      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const k = parts[1];
      const v = parts[2];
      const kv = `${k}/${v}`;

      items.forEach(item => {
        total++;
        let tags = item.tags;
        let name = '';   // which "name" we use for the locales check below

        // Perform tree-specific tag cleanups here..
        if (t === 'brands') {
          name = tags.brand || tags.name;

          // assign some default tags if missing
          if (kv === 'amenity/cafe') {
            if (!tags.takeaway)    tags.takeaway = 'yes';
            if (!tags.cuisine)     tags.cuisine = 'coffee_shop';
          } else if (kv === 'amenity/fast_food') {
            if (!tags.takeaway)    tags.takeaway = 'yes';
          } else if (kv === 'amenity/pharmacy') {
            if (!tags.healthcare)  tags.healthcare = 'pharmacy';
          }

        } else if (t === 'flags') {
          name = tags['flag:name'];

        } else if (t === 'operators') {
          name = tags.operator || tags.brand;

          // Seed missing operator tags (for a file that we copied over from the 'brand' tree)
          Object.keys(tags).forEach(osmkey => {
            if (/brand/.test(osmkey)) {
              let operatorkey = osmkey.replace('brand', 'operator');   // copy `brand`->`operator`, `brand:ru`->`operator:ru`, etc.
              if (!tags[operatorkey]) tags[operatorkey] = tags[osmkey];
            }
          });

          // For certain 'operator' categories that are kind of like brands,
          // copy missing tags the other way too and include names
          //  (note: we can change this later of people hate it)
          // https://github.com/osmlab/name-suggestion-index/issues/2883#issuecomment-726305200
          if (/^amenity\/(bicycle|car|post)/.test(kv)) {
            Object.keys(tags).forEach(osmkey => {
              // an operator tag (but not `operator:type`)
              if (/operator(?!(:type))/.test(osmkey)) {
                let brandkey = osmkey.replace('operator', 'brand');  // copy `operator`->`brand`, `operator:ru`->`brand:ru`, etc.
                if (!tags[brandkey]) tags[brandkey] = tags[osmkey];
                if (!/wiki/.test(osmkey)) {
                  let namekey = osmkey.replace('operator', 'name');   // copy `operator`->`name`, `operator:ru`->`name:ru`, etc.
                  if (!tags[namekey]) tags[namekey] = tags[osmkey];
                }
              }
            });
          }

        } else if (t === 'transit') {
          name = tags.network;

          // If the operator is the same as the network, copy any missing *:wikipedia/*:wikidata tags
          if (tags.network && tags.operator && tags.network === tags.operator) {
            if (!tags['operator:wikidata'] && tags['network:wikidata'])    tags['operator:wikidata'] = tags['network:wikidata'];
            if (!tags['operator:wikipedia'] && tags['network:wikipedia'])  tags['operator:wikipedia'] = tags['network:wikipedia'];
            if (!tags['network:wikidata'] && tags['operator:wikidata'])    tags['network:wikidata'] = tags['operator:wikidata'];
            if (!tags['network:wikipedia'] && tags['operator:wikipedia'])  tags['network:wikipedia'] = tags['operator:wikipedia'];
          }
        }

        // If the name can only be reasonably read in one country,
        // assign `locationSet`, and localize tags like `name:xx`
        // https://www.regular-expressions.info/unicode.html
        if (/[\u0590-\u05FF]/.test(name)) {          // Hebrew
          // note: old ISO 639-1 lang code for Hebrew was `iw`, now `he`
          if (!item.locationSet)  item.locationSet = { include: ['il'] };
          setLanguageTags(tags, 'he');
        } else if (/[\u0E00-\u0E7F]/.test(name)) {   // Thai
          if (!item.locationSet)  item.locationSet = { include: ['th'] };
          setLanguageTags(tags, 'th');
        } else if (/[\u1000-\u109F]/.test(name)) {   // Myanmar
          if (!item.locationSet)  item.locationSet = { include: ['mm'] };
          setLanguageTags(tags, 'my');
        } else if (/[\u1100-\u11FF]/.test(name)) {   // Hangul
          if (!item.locationSet)  item.locationSet = { include: ['kr'] };
          setLanguageTags(tags, 'ko');
        } else if (/[\u1700-\u171F]/.test(name)) {   // Tagalog
          if (!item.locationSet)  item.locationSet = { include: ['ph'] };
          setLanguageTags(tags, 'tl');
        } else if (/[\u3040-\u30FF]/.test(name)) {   // Hirgana or Katakana
          if (!item.locationSet)  item.locationSet = { include: ['jp'] };
          setLanguageTags(tags, 'ja');
        } else if (/[\u3130-\u318F]/.test(name)) {   // Hangul
          if (!item.locationSet)  item.locationSet = { include: ['kr'] };
          setLanguageTags(tags, 'ko');
        } else if (/[\uA960-\uA97F]/.test(name)) {   // Hangul
          if (!item.locationSet)  item.locationSet = { include: ['kr'] };
          setLanguageTags(tags, 'ko');
        } else if (/[\uAC00-\uD7AF]/.test(name)) {   // Hangul
          if (!item.locationSet)  item.locationSet = { include: ['kr'] };
          setLanguageTags(tags, 'ko');
        } else {
          if (!item.locationSet)  item.locationSet = { include: ['001'] };   // the whole world
        }

        // Perform common tag cleanups here..
        Object.keys(tags).forEach(osmkey => {
          // `website` tag should be the website for that location, not the website for the brand..
          if (osmkey === 'website') {
            delete tags[osmkey];
            return;
          }

          // Replace QID/Wikipedia replacements
          const matchTag = osmkey.match(/^(\w+):wikidata$/);
          if (matchTag) {                         // Look at '*:wikidata' tags
            const wd = tags[osmkey];
            const replace = _config.replacements[wd];    // If it matches a QID in the replacement list...

            if (replace && replace.wikidata !== undefined) {   // replace or delete `*:wikidata` tag
              if (replace.wikidata) {
                tags[osmkey] = replace.wikidata;
              } else {
                delete tags[osmkey];
              }
            }
            if (replace && replace.wikipedia !== undefined) {  // replace or delete `*:wikipedia` tag
              const wpkey = matchTag[1] + ':wikipedia';
              if (replace.wikipedia) {
                tags[wpkey] = replace.wikipedia;
              } else {
                delete tags[wpkey];
              }
            }
          }
        });

        // regenerate id here, in case the locationSet has changed
        const locationID = loco.validateLocationSet(item.locationSet).id;
        item.id = idgen(item, tkv, locationID);
      });
    });

    console.log(`${tree.emoji}  ${t}:\t${total} total, ${totalNew} new`);

  });

  console.timeEnd(END);

  function setLanguageTags(tags, code) {
    if (tags.name)      tags[`name:${code}`] = tags.name;
    if (tags.brand)     tags[`brand:${code}`] = tags.brand;
    if (tags.operator)  tags[`operator:${code}`] = tags.operator;
    if (tags.network)   tags[`network:${code}`] = tags.network;
  }
}


//
// checkItems()
// Checks all the items for several kinds of issues
//
function checkItems(t) {
  console.log('');
  console.log('🏗   ' + colors.yellow(`Checking ${t}...`));

  const tree = _config.trees[t];
  const oddChars = /[\s=!"#%'*{},.\/:?\(\)\[\]@\\$\^*+<>«»~`’\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u200b-\u200f\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\ufeff\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g;

  let warnMatched = matcher.getWarnings();
  let warnDuplicate = [];
  let warnFormatWikidata = [];
  let warnFormatWikipedia = [];
  let warnMissingTag = [];
  let warnFormatTag = [];
  let seenName = {};

  let total = 0;      // total items
  let totalWd = 0;    // total items with wikidata

  const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === t);
  const display = (val) => `${val.displayName} (${val.id})`;

  paths.forEach(tkv => {
    const items = _cache.path[tkv];
    if (!Array.isArray(items) || !items.length) return;

    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const k = parts[1];
    const v = parts[2];
    const kv = `${k}/${v}`;

    items.forEach(item => {
      const tags = item.tags;

      total++;
      if (tags[tree.mainTag]) totalWd++;

      // check tags
      Object.keys(tags).forEach(osmkey => {
        if (/:wikidata$/.test(osmkey)) {       // Check '*:wikidata' tags
          const wd = tags[osmkey];
          if (!/^Q\d+$/.test(wd)) {
            warnFormatWikidata.push([display(item), wd]);
          }
        }
        if (/:wikipedia$/.test(osmkey)) {      // Check '*.wikipedia' tags
          // So many contributors get the wikipedia tags wrong, so let's just reformat it for them.
          const wp = tags[osmkey] = decodeURIComponent(tags[osmkey]).replace(/_/g, ' ');
          if (!/^[a-z\-]{2,}:[^_]*$/.test(wp)) {
            warnFormatWikipedia.push([display(item), wp]);
          }
        }
      });

      // Warn on other missing tags
      switch (kv) {
        case 'amenity/gambling':
        case 'leisure/adult_gaming_centre':
          if (!tags.gambling) { warnMissingTag.push([display(item), 'gambling']); }
          break;
        case 'amenity/fast_food':
        case 'amenity/restaurant':
          if (!tags.cuisine) { warnMissingTag.push([display(item), 'cuisine']); }
          break;
        case 'amenity/vending_machine':
          if (!tags.vending) { warnMissingTag.push([display(item), 'vending']); }
          break;
        case 'man_made/flagpole':
          if (!tags['flag:type']) { warnMissingTag.push([display(item), 'flag:type']); }
          if (!tags['subject']) { warnMissingTag.push([display(item), 'subject']); }
          if (!tags['subject:wikidata']) { warnMissingTag.push([display(item), 'subject:wikidata']); }
          break;
        case 'shop/beauty':
          if (!tags.beauty) { warnMissingTag.push([display(item), 'beauty']); }
          break;
      }

      // Warn if OSM tags contain odd punctuation or spacing..
      ['cuisine', 'vending', 'beauty', 'gambling'].forEach(osmkey => {
        const val = tags[osmkey];
        if (val && oddChars.test(val)) {
          warnFormatTag.push([display(item), `${osmkey} = ${val}`]);
        }
      });
      // Warn if a semicolon-delimited multivalue has snuck into the index
      ['name', 'brand', 'operator', 'network'].forEach(osmkey => {
        const val = tags[osmkey];
        if (val && /;/.test(val)) {
          warnFormatTag.push([display(item), `${osmkey} = ${val}`]);
        }
      });
      // Warn if user put `wikidata`/`wikipedia` instead of `brand:wikidata`/`brand:wikipedia`
      ['wikipedia', 'wikidata'].forEach(osmkey => {
        const val = tags[osmkey];
        if (val) {
          warnFormatTag.push([display(item), `${osmkey} = ${val}`]);
        }
      });


// TODO ?
  //     // Warn about "new" (no wikidata) items that may duplicate an "existing" (has wikidata) item.
  //     // The criteria for this warning is:
  //     // - One of the items has no `brand:wikidata`
  //     // - The items have nearly the same name
  //     // - The items have the same locationSet (or the one without wikidata is worldwide)
  //     const name = tags.name || tags.brand;
  //     const stem = stemmer(name) || name;
  //     const itemwd = tags[tree.mainTag];
  //     const itemls = loco.validateLocationSet(item.locationSet).id;

  //     if (!seenName[stem]) seenName[stem] = new Set();
  //     seenName[stem].add(item);

  //     if (seenName[stem].size > 1) {
  //       seenName[stem].forEach(other => {
  //         if (other.id === item.id) return;   // skip self
  //         const otherwd = other.tags[tree.mainTag];
  //         const otherls = loco.validateLocationSet(other.locationSet).id;

  //         // pick one of the items without a wikidata tag to be the "duplicate"
  //         if (!itemwd && (itemls === otherls || itemls === '+[Q2]')) {
  //           warnDuplicate.push([display(item), display(other)]);
  //         } else if (!otherwd && (otherls === itemls || otherls === '+[Q2]')) {
  //           warnDuplicate.push([display(other), display(item)]);
  //         }
  //       });
  //     }

    });
  });

  if (warnMatched.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Ambiguous matches:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  If the items are the different, make sure they have different locationSets (e.g. "us", "ca"'));
    console.warn(colors.gray('  If the items are the same, remove extra `matchTags` or `matchNames`.  Remember:'));
    console.warn(colors.gray('  - Name matching ignores letter case, punctuation, spacing, and diacritical marks (é vs e). '));
    console.warn(colors.gray('    No need to add `matchNames` for variations in these.'));
    console.warn(colors.gray('  - Tag matching automatically includes other similar tags in the same match group.'));
    console.warn(colors.gray('    No need to add `matchTags` for similar tags.  see `config/match_groups.json`'));
    console.warn(colors.gray('-').repeat(70));
    warnMatched.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> matches? -> ' + colors.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnMatched.length);
  }

  if (warnMissingTag.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Missing tag:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  To resolve these, add the missing tag.'));
    console.warn(colors.gray('-').repeat(70));
    warnMissingTag.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> missing tag? -> ' + colors.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnMissingTag.length);
  }

  if (warnFormatTag.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Unusual OpenStreetMap tag:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  To resolve these, make sure the OpenStreetMap tag is correct.'));
    console.warn(colors.gray('-').repeat(70));
    warnFormatTag.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> unusual tag? -> ' + colors.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnFormatTag.length);
  }

  if (warnDuplicate.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Potential duplicate:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  If the items are two different businesses,'));
    console.warn(colors.gray('    make sure they both have accurate locationSets (e.g. "us"/"ca") and wikidata identifiers.'));
    console.warn(colors.gray('  If the items are duplicates of the same business,'));
    console.warn(colors.gray('    add `matchTags`/`matchNames` properties to the item that you want to keep, and delete the unwanted item.'));
    console.warn(colors.gray('  If the duplicate item is a generic word,'));
    console.warn(colors.gray('    add a filter to config/filter_brands.json and delete the unwanted item.'));
    console.warn(colors.gray('-').repeat(70));
    warnDuplicate.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> duplicates? -> ' + colors.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnDuplicate.length);
  }

  if (warnFormatWikidata.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Incorrect `wikidata` format:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  To resolve these, make sure "*:wikidata" tag looks like "Q191615".'));
    console.warn(colors.gray('-').repeat(70));
    warnFormatWikidata.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> "*:wikidata": ' + '"' + w[1] + '"'
    ));
    console.warn('total ' + warnFormatWikidata.length);
  }

  if (warnFormatWikipedia.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Incorrect `wikipedia` format:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  To resolve these, make sure "*:wikipedia" tag looks like "en:Pizza Hut".'));
    console.warn(colors.gray('-').repeat(70));
    warnFormatWikipedia.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> "*:wikipedia": ' + '"' + w[1] + '"'
    ));
    console.warn('total ' + warnFormatWikipedia.length);
  }

  const pctWd = total > 0 ? (totalWd * 100 / total).toFixed(1) : 0;

  console.log('');
  console.info(colors.blue.bold(`${tree.emoji}  ${t}/* completeness:`));
  console.info(colors.blue.bold(`    ${total} total`));
  console.info(colors.blue.bold(`    ${totalWd} (${pctWd}%) with a '${tree.mainTag}' tag`));
}