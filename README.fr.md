[![Build Status](https://travis-ci.org/osmlab/name-suggestion-index.svg?branch=main)](https://travis-ci.org/osmlab/name-suggestion-index)
[![npm version](https://badge.fury.io/js/name-suggestion-index.svg)](https://badge.fury.io/js/name-suggestion-index)

## name-suggestion-index

Noms de marque communs canoniques pour OpenStreetMap.


### Qu'est-ce que c'est?

Le but de ce projet est de maintenir un [canonique](https://fr.wikipedia.org/wiki/Canonique_(informatique))
liste des noms couramment utilisés pour suggérer l'orthographe et le balisage cohérents des fonctionnalités
dans OpenStreetMap.

[Regardez la vidéo](https://2019.stateofthemap.us/program/sat/mapping-brands-with-the-name-suggestion-index.html) de notre conférence à State of the Map US 2019 pour en savoir plus sur ce projet!


### Parcourir l'index

Vous pouvez parcourir l'index à https://nsi.guide/ pour voir quelles marques manquent de liens Wikidata ou ont des pages Wikipedia incomplètes.


### Comment il est utilisé

Lorsque les mappeurs créent des fonctionnalités dans OpenStreetMap, ils ne sont pas toujours cohérents sur la façon dont ils
nommez et étiquetez les choses. Par exemple, nous pouvons préférer `McDonald's` étiqueté comme `amenity=fast_food`
mais nous voyons de nombreux exemples d'autres orthographes (`Mc Donald's`, `McDonalds`, `McDonald’s`) et
étiquetages (`amenity=restaurant`).

La construction d'un index de nom canonique permet deux choses très utiles:
- Nous pouvons suggérer la manière la plus "correcte" d'étiqueter les choses lorsque les utilisateurs les créent pendant l'édition.
- Nous pouvons analyser les données OSM pour les fonctionnalités "incorrectes" et produire des listes pour révision et nettoyage.

<img width="1017px" alt="Index de suggestion de noms utilisé dans iD" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/nsi-in-iD.gif"/>

* L'index de suggestion de nom est utilisé dans iD lors de l'ajout d'un nouvel élément *

Actuellement utilisé dans:
- iD (voir ci-dessus)
- [Vespucci](http://vespucci.io/tutorials/name_suggestions/)
- [Présélections JOSM](https://josm.openstreetmap.de/wiki/Help/Preferences/Map#TaggingPresets) disponibles
- [Osmose](http://osmose.openstreetmap.fr/en/errors/?item=3130)


### Participer!

* Lisez le projet [Code de conduite](CODE_OF_CONDUCT.md) et n'oubliez pas d'être gentils les uns envers les autres.
* Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour savoir comment contribuer à cet index.

Nous cherchons toujours de l'aide! Si vous avez des questions ou souhaitez contacter un responsable, envoyez une requête ping à `bhousel` sur:
* [OpenStreetMap US Slack](https://slack.openstreetmap.us/)
(Chaînes `#poi` ou `#general`)


### Conditions préalables

* [Node.js](https://nodejs.org/) version 10 ou plus récente
* [`git`](https://www.atlassian.com/git/tutorials/install-git/) pour votre plateforme


### Installation

* Clonez ce projet, par exemple:
  `git clone git@github.com:osmlab/name-suggestion-index.git`
* `cd` dans le dossier du projet,
* Exécutez `npm install` pour installer les bibliothèques


### À propos de l'index

#### Fichiers générés (ne pas modifier):

Fichiers prédéfinis (utilisés par les éditeurs OSM):
* `dist/name-suggestions.json` - Préréglages de suggestion de nom
* `dist/name-suggestions.min.json` - Préréglages de suggestion de nom, minifiés
* `dist/name-suggestions.presets.xml` - Préréglages de suggestion de nom, comme XML prédéfini de style JOSM

Listes de noms:
* `dist/collected/*` - tous les noms et balises fréquents collectés depuis OpenStreetMap
* `dist/filtered/*` - sous-ensemble de `names_all` que nous conservons / éliminons
* `dist/wikidata.json` - données de marque en cache récupérées à partir de Wikidata

#### Fichiers de configuration (modifiez-les):

* `config/*`
  * `config/filters.json` - Expressions régulières utilisées pour filtrer `names_all` dans `names_keep`/`names_discard`
* `brands/*` - Fichiers de configuration pour chaque type d'entreprise de marque, organisés par balise OpenStreetMap
  * `brands/amenity/*.json`
  * `brands/leisure/*.json`
  * `brands/shop/*.json`
  * `brands/tourism/*.json`
  * `brands/office/*.json`

:point_right: Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour savoir comment contribuer à cet index.


### Création de l'index

* `npm run build`
  * Régénère `dist/filtered/names_keep.json` et `dist/filtered/names_discard.json`
  * Toutes les nouvelles entrées de `names_keep` qui ne sont pas déjà présentes dans l'index y seront ajoutées
  * Génère de nombreux avertissements pour suggérer des mises à jour de `brands/**/*.json`


### Autres commandes

* `npm run wikidata` - Récupère les données utiles de Wikidata - étiquettes, descriptions, logos, etc.
* `npm run` - Liste les autres outils disponibles

### Mise à jour de `dist/names_all.json` depuis la planète

Cela prend beaucoup de temps et beaucoup d'espace disque. Cela peut être fait occasionnellement par les responsables du projet.
Vous n'avez pas besoin de suivre ces étapes pour contribuer à l'index.

- Installer l'outil de ligne de commande `osmium` et le package de nœuds (peut être disponible uniquement dans certains environnements)
  - `apt-get install osmium-tool` ou `brew install osmium-tool` ou similaire
  - `npm install --no-save osmium`
- [Télécharger la planète](http://planet.osm.org/pbf/)
  - `curl -L -o planet-latest.osm.pbf https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf`
- Préfiltrez le fichier planète pour inclure uniquement les éléments nommés avec les clés que nous recherchons:
  - `osmium tags-filter planet-latest.osm.pbf -R name,brand,operator,network -o named.osm.pbf`
- Exécutez `node collect_all.js wanted.osm.pbf`
   - les résultats iront dans `dist/collected/*.json`
  - `git add dist/collected && git commit -m 'Updated dist/collected'`


### Licence

nom-suggestion-index est disponible sous la [licence BSD à 3 clauses](https://opensource.org/licenses/BSD-3-Clause).
Voir le fichier [LICENSE.md](LICENSE.md) pour plus de détails.
