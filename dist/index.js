(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.nsi = {}));
}(this, (function (exports) { 'use strict';

  var remove = removeDiacritics;

  var replacementList = [
    {
      base: ' ',
      chars: "\u00A0",
    }, {
      base: '0',
      chars: "\u07C0",
    }, {
      base: 'A',
      chars: "\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F",
    }, {
      base: 'AA',
      chars: "\uA732",
    }, {
      base: 'AE',
      chars: "\u00C6\u01FC\u01E2",
    }, {
      base: 'AO',
      chars: "\uA734",
    }, {
      base: 'AU',
      chars: "\uA736",
    }, {
      base: 'AV',
      chars: "\uA738\uA73A",
    }, {
      base: 'AY',
      chars: "\uA73C",
    }, {
      base: 'B',
      chars: "\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0181",
    }, {
      base: 'C',
      chars: "\u24b8\uff23\uA73E\u1E08\u0106\u0043\u0108\u010A\u010C\u00C7\u0187\u023B",
    }, {
      base: 'D',
      chars: "\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018A\u0189\u1D05\uA779",
    }, {
      base: 'Dh',
      chars: "\u00D0",
    }, {
      base: 'DZ',
      chars: "\u01F1\u01C4",
    }, {
      base: 'Dz',
      chars: "\u01F2\u01C5",
    }, {
      base: 'E',
      chars: "\u025B\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E\u1D07",
    }, {
      base: 'F',
      chars: "\uA77C\u24BB\uFF26\u1E1E\u0191\uA77B",
    }, {
      base: 'G',
      chars: "\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E\u0262",
    }, {
      base: 'H',
      chars: "\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D",
    }, {
      base: 'I',
      chars: "\u24BE\uFF29\xCC\xCD\xCE\u0128\u012A\u012C\u0130\xCF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197",
    }, {
      base: 'J',
      chars: "\u24BF\uFF2A\u0134\u0248\u0237",
    }, {
      base: 'K',
      chars: "\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2",
    }, {
      base: 'L',
      chars: "\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780",
    }, {
      base: 'LJ',
      chars: "\u01C7",
    }, {
      base: 'Lj',
      chars: "\u01C8",
    }, {
      base: 'M',
      chars: "\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C\u03FB",
    }, {
      base: 'N',
      chars: "\uA7A4\u0220\u24C3\uFF2E\u01F8\u0143\xD1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u019D\uA790\u1D0E",
    }, {
      base: 'NJ',
      chars: "\u01CA",
    }, {
      base: 'Nj',
      chars: "\u01CB",
    }, {
      base: 'O',
      chars: "\u24C4\uFF2F\xD2\xD3\xD4\u1ED2\u1ED0\u1ED6\u1ED4\xD5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\xD6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\xD8\u01FE\u0186\u019F\uA74A\uA74C",
    }, {
      base: 'OE',
      chars: "\u0152",
    }, {
      base: 'OI',
      chars: "\u01A2",
    }, {
      base: 'OO',
      chars: "\uA74E",
    }, {
      base: 'OU',
      chars: "\u0222",
    }, {
      base: 'P',
      chars: "\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754",
    }, {
      base: 'Q',
      chars: "\u24C6\uFF31\uA756\uA758\u024A",
    }, {
      base: 'R',
      chars: "\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782",
    }, {
      base: 'S',
      chars: "\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784",
    }, {
      base: 'T',
      chars: "\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786",
    }, {
      base: 'Th',
      chars: "\u00DE",
    }, {
      base: 'TZ',
      chars: "\uA728",
    }, {
      base: 'U',
      chars: "\u24CA\uFF35\xD9\xDA\xDB\u0168\u1E78\u016A\u1E7A\u016C\xDC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244",
    }, {
      base: 'V',
      chars: "\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245",
    }, {
      base: 'VY',
      chars: "\uA760",
    }, {
      base: 'W',
      chars: "\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72",
    }, {
      base: 'X',
      chars: "\u24CD\uFF38\u1E8A\u1E8C",
    }, {
      base: 'Y',
      chars: "\u24CE\uFF39\u1EF2\xDD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE",
    }, {
      base: 'Z',
      chars: "\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762",
    }, {
      base: 'a',
      chars: "\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250\u0251",
    }, {
      base: 'aa',
      chars: "\uA733",
    }, {
      base: 'ae',
      chars: "\u00E6\u01FD\u01E3",
    }, {
      base: 'ao',
      chars: "\uA735",
    }, {
      base: 'au',
      chars: "\uA737",
    }, {
      base: 'av',
      chars: "\uA739\uA73B",
    }, {
      base: 'ay',
      chars: "\uA73D",
    }, {
      base: 'b',
      chars: "\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253\u0182",
    }, {
      base: 'c',
      chars: "\uFF43\u24D2\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184",
    }, {
      base: 'd',
      chars: "\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\u018B\u13E7\u0501\uA7AA",
    }, {
      base: 'dh',
      chars: "\u00F0",
    }, {
      base: 'dz',
      chars: "\u01F3\u01C6",
    }, {
      base: 'e',
      chars: "\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u01DD",
    }, {
      base: 'f',
      chars: "\u24D5\uFF46\u1E1F\u0192",
    }, {
      base: 'ff',
      chars: "\uFB00",
    }, {
      base: 'fi',
      chars: "\uFB01",
    }, {
      base: 'fl',
      chars: "\uFB02",
    }, {
      base: 'ffi',
      chars: "\uFB03",
    }, {
      base: 'ffl',
      chars: "\uFB04",
    }, {
      base: 'g',
      chars: "\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\uA77F\u1D79",
    }, {
      base: 'h',
      chars: "\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265",
    }, {
      base: 'hv',
      chars: "\u0195",
    }, {
      base: 'i',
      chars: "\u24D8\uFF49\xEC\xED\xEE\u0129\u012B\u012D\xEF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131",
    }, {
      base: 'j',
      chars: "\u24D9\uFF4A\u0135\u01F0\u0249",
    }, {
      base: 'k',
      chars: "\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3",
    }, {
      base: 'l',
      chars: "\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747\u026D",
    }, {
      base: 'lj',
      chars: "\u01C9",
    }, {
      base: 'm',
      chars: "\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F",
    }, {
      base: 'n',
      chars: "\u24DD\uFF4E\u01F9\u0144\xF1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5\u043B\u0509",
    }, {
      base: 'nj',
      chars: "\u01CC",
    }, {
      base: 'o',
      chars: "\u24DE\uFF4F\xF2\xF3\xF4\u1ED3\u1ED1\u1ED7\u1ED5\xF5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\xF6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\xF8\u01FF\uA74B\uA74D\u0275\u0254\u1D11",
    }, {
      base: 'oe',
      chars: "\u0153",
    }, {
      base: 'oi',
      chars: "\u01A3",
    }, {
      base: 'oo',
      chars: "\uA74F",
    }, {
      base: 'ou',
      chars: "\u0223",
    }, {
      base: 'p',
      chars: "\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755\u03C1",
    }, {
      base: 'q',
      chars: "\u24E0\uFF51\u024B\uA757\uA759",
    }, {
      base: 'r',
      chars: "\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783",
    }, {
      base: 's',
      chars: "\u24E2\uFF53\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B\u0282",
    }, {
      base: 'ss',
      chars: "\xDF",
    }, {
      base: 't',
      chars: "\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787",
    }, {
      base: 'th',
      chars: "\u00FE",
    }, {
      base: 'tz',
      chars: "\uA729",
    }, {
      base: 'u',
      chars: "\u24E4\uFF55\xF9\xFA\xFB\u0169\u1E79\u016B\u1E7B\u016D\xFC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289",
    }, {
      base: 'v',
      chars: "\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C",
    }, {
      base: 'vy',
      chars: "\uA761",
    }, {
      base: 'w',
      chars: "\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73",
    }, {
      base: 'x',
      chars: "\u24E7\uFF58\u1E8B\u1E8D",
    }, {
      base: 'y',
      chars: "\u24E8\uFF59\u1EF3\xFD\u0177\u1EF9\u0233\u1E8F\xFF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF",
    }, {
      base: 'z',
      chars: "\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763",
    }
  ];

  var diacriticsMap = {};
  for (var i = 0; i < replacementList.length; i += 1) {
    var chars = replacementList[i].chars;
    for (var j = 0; j < chars.length; j += 1) {
      diacriticsMap[chars[j]] = replacementList[i].base;
    }
  }

  function removeDiacritics(str) {
    return str.replace(/[^\u0000-\u007e]/g, function(c) {
      return diacriticsMap[c] || c;
    });
  }

  var replacementList_1 = replacementList;
  var diacriticsMap_1 = diacriticsMap;

  var diacritics = {
  	remove: remove,
  	replacementList: replacementList_1,
  	diacriticsMap: diacriticsMap_1
  };

  // remove spaces, punctuation, diacritics
  var simplify = (str) => {
    return diacritics.remove(
      str
        .replace(/&/g, 'and')
        .replace(/[\s\-=_!"#%'*{},.\/:;?\(\)\[\]@\\$\^*+<>~`’\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g,'')
        .toLowerCase()
    );
  };

  // toParts - split a name-suggestion-index key into parts
  // {
  //   kvnd:        "amenity/fast_food|Thaï Express~(North America)",
  //   kvn:         "amenity/fast_food|Thaï Express",
  //   kv:          "amenity/fast_food",
  //   k:           "amenity",
  //   v:           "fast_food",
  //   n:           "Thaï Express",
  //   d:           "(North America)",
  //   nsimple:     "thaiexpress",
  //   kvnnsimple:  "amenity/fast_food|thaiexpress"
  // }
  var to_parts = (kvnd) => {
    const parts = {};
    parts.kvnd = kvnd;

    const kvndparts = kvnd.split('~', 2);
    if (kvndparts.length > 1) parts.d = kvndparts[1];

    parts.kvn = kvndparts[0];
    const kvnparts = parts.kvn.split('|', 2);
    if (kvnparts.length > 1) parts.n = kvnparts[1];

    parts.kv = kvnparts[0];
    const kvparts = parts.kv.split('/', 2);
    parts.k = kvparts[0];
    parts.v = kvparts[1];

    parts.nsimple = simplify(parts.n);
    parts.kvnsimple = parts.kv + '|' + parts.nsimple;
    return parts;
  };

  var matchGroups = {beauty:["shop/beauty","shop/hairdresser_supply"],bed:["shop/bed","shop/furniture"],beverages:["shop/alcohol","shop/beverages"],camping:["leisure/park","tourism/camp_site","tourism/caravan_site"],car_parts:["shop/car_parts","shop/car_repair","shop/tires","shop/tyres"],confectionery:["shop/candy","shop/chocolate","shop/confectionery"],convenience:["shop/beauty","shop/chemist","shop/convenience","shop/cosmetics","shop/newsagent"],coworking:["amenity/coworking_space","office/coworking","office/coworking_space"],electronics:["office/telecommunication","shop/computer","shop/electronics","shop/hifi","shop/mobile","shop/mobile_phone","shop/telecommunication"],fashion:["shop/accessories","shop/bag","shop/botique","shop/clothes","shop/department_store","shop/fashion","shop/fashion_accessories","shop/sports","shop/shoes"],financial:["amenity/bank","office/accountant","office/financial","office/financial_advisor","office/tax_advisor","shop/tax"],fitness:["leisure/fitness_centre","leisure/fitness_center","leisure/sports_centre","leisure/sports_center"],food:["amenity/cafe","amenity/fast_food","amenity/ice_cream","amenity/restaurant","shop/bakery","shop/ice_cream","shop/pastry","shop/tea","shop/coffee"],fuel:["amenity/fuel","shop/gas","shop/convenience;gas","shop/gas;convenience"],gift:["shop/gift","shop/card","shop/cards","shop/stationery"],hardware:["shop/carpet","shop/diy","shop/doityourself","shop/doors","shop/electrical","shop/flooring","shop/hardware","shop/power_tools","shop/tool_hire","shop/tools","shop/trade"],health_food:["shop/health","shop/health_food","shop/herbalist","shop/nutrition_supplements"],houseware:["shop/houseware","shop/interior_decoration"],lodging:["tourism/hotel","tourism/motel"],money_transfer:["amenity/money_transfer","shop/money_transfer"],outdoor:["shop/outdoor","shop/sports"],rental:["amenity/bicycle_rental","amenity/boat_rental","amenity/car_rental","amenity/truck_rental","amenity/vehicle_rental","shop/rental"],school:["amenity/childcare","amenity/college","amenity/kindergarten","amenity/language_school","amenity/prep_school","amenity/school","amenity/university"],supermarket:["shop/food","shop/frozen_food","shop/greengrocer","shop/grocery","shop/supermarket","shop/wholesale"],variety_store:["shop/variety_store","shop/supermarket","shop/discount","shop/convenience"],vending:["amenity/vending_machine","shop/vending_machine"],wholesale:["shop/wholesale","shop/supermarket","shop/department_store"]};
  var match_groups = {
  matchGroups: matchGroups
  };

  var match_groups$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    matchGroups: matchGroups,
    'default': match_groups
  });

  function getCjsExportFromNamespace (n) {
  	return n && n['default'] || n;
  }

  var require$$0 = getCjsExportFromNamespace(match_groups$1);

  const matchGroups$1 = require$$0.matchGroups;


  var matcher = () => {
    let _warnings = [];  // array of match conflict pairs
    let _ambiguous = {};
    let _matchIndex = {};
    let matcher = {};


    // Create an index of all the keys/simplenames for fast matching
    matcher.buildMatchIndex = (brands) => {
      // two passes - once for primary names, once for secondary/alternate names
      Object.keys(brands).forEach(kvnd => insertNames(kvnd, 'primary'));
      Object.keys(brands).forEach(kvnd => insertNames(kvnd, 'secondary'));


      function insertNames(kvnd, which) {
        const obj = brands[kvnd];
        const parts = to_parts(kvnd);

        // Exit early for ambiguous names in the second pass.
        // They were collected in the first pass and we don't gather alt names for them.
        if (which === 'secondary' && parts.d) return;


        if (obj.countryCodes) {
          parts.countryCodes = obj.countryCodes.slice();  // copy
        }

        const nomatches = (obj.nomatch || []);
        if (nomatches.some(s => s === kvnd)) {
          console.log(`WARNING match/nomatch conflict for ${kvnd}`);
          return;
        }

        const match_kv = [parts.kv]
          .concat(obj.matchTags || [])
          .concat([`${parts.k}/yes`, `building/yes`])   // #3454 - match some generic tags
          .map(s => s.toLowerCase());

        let match_nsimple = [];
        if (which === 'primary') {
          match_nsimple = [parts.n]
            .concat(obj.matchNames || [])
            .concat(obj.tags.official_name || [])   // #2732 - match alternate names
            .map(simplify);

        } else if (which === 'secondary') {
          match_nsimple = []
            .concat(obj.tags.alt_name || [])        // #2732 - match alternate names
            .concat(obj.tags.short_name || [])      // #2732 - match alternate names
            .map(simplify);
        }

        if (!match_nsimple.length) return;  // nothing to do

        match_kv.forEach(kv => {
          match_nsimple.forEach(nsimple => {
            if (parts.d) {
              // Known ambiguous names with disambiguation string ~(USA) / ~(Canada)
              // FIXME: Name collisions will overwrite the initial entry (ok for now)
              if (!_ambiguous[kv]) _ambiguous[kv] = {};
              _ambiguous[kv][nsimple] = parts;

            } else {
              // Names we mostly expect to be unique..
              if (!_matchIndex[kv]) _matchIndex[kv] = {};

              const m = _matchIndex[kv][nsimple];
              if (m) {  // There already is a match for this name, skip it
                // Warn if we detect collisions in a primary name.
                // Skip warning if a secondary name or a generic `*=yes` tag - #2972 / #3454
                if (which === 'primary' && !/\/yes$/.test(kv)) {
                  _warnings.push([m.kvnd, `${kvnd} (${kv}/${nsimple})`]);
                }
              } else {
                _matchIndex[kv][nsimple] = parts;   // insert
              }
            }
          });
        });

      }
    };


    // pass a `key`, `value`, `name` and return the best match,
    // `countryCode` optional (if supplied, must match that too)
    matcher.matchKVN = (key, value, name, countryCode) => {
      return matcher.matchParts(to_parts(`${key}/${value}|${name}`), countryCode);
    };


    // pass a parts object and return the best match,
    // `countryCode` optional (if supplied, must match that too)
    matcher.matchParts = (parts, countryCode) => {
      let match = null;
      let inGroup = false;

      // fixme: we currently return a single match for ambiguous
      match = _ambiguous[parts.kv] && _ambiguous[parts.kv][parts.nsimple];
      if (match && matchesCountryCode(match)) return match;

      // try to return an exact match
      match = _matchIndex[parts.kv] && _matchIndex[parts.kv][parts.nsimple];
      if (match && matchesCountryCode(match)) return match;

      // look in match groups
      for (let mg in matchGroups$1) {
        const matchGroup = matchGroups$1[mg];
        match = null;
        inGroup = false;

        for (let i = 0; i < matchGroup.length; i++) {
          const otherkv = matchGroup[i].toLowerCase();
          if (!inGroup) {
            inGroup = otherkv === parts.kv;
          }
          if (!match) {
            // fixme: we currently return a single match for ambiguous
            match = _ambiguous[otherkv] && _ambiguous[otherkv][parts.nsimple];
          }
          if (!match) {
            match = _matchIndex[otherkv] && _matchIndex[otherkv][parts.nsimple];
          }

          if (match && !matchesCountryCode(match)) {
            match = null;
          }

          if (inGroup && match) {
            return match;
          }
        }
      }

      return null;

      function matchesCountryCode(match) {
        if (!countryCode) return true;
        if (!match.countryCodes) return true;
        return match.countryCodes.indexOf(countryCode) !== -1;
      }
    };


    matcher.getWarnings = () => _warnings;

    return matcher;
  };

  // Removes noise from the name so that we can compare
  // similar names for catching duplicates.
  var stemmer = (name) => {
    const noise = [
      /ban(k|c)(a|o)?/ig,
      /банк/ig,
      /coop/ig,
      /express/ig,
      /(gas|fuel)/ig,
      /wireless/ig,
      /(shop|store)/ig
    ];

    name = noise.reduce((acc, regex) => acc.replace(regex, ''), name);
    return simplify(name);
  };

  exports.matcher = matcher;
  exports.simplify = simplify;
  exports.stemmer = stemmer;
  exports.toParts = to_parts;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
