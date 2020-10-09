(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.nsi = {}));
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

  var matchGroups = {adult_gaming_centre:["amenity/casino","amenity/gambling","leisure/adult_gaming_centre"],beauty:["shop/beauty","shop/hairdresser_supply"],bed:["shop/bed","shop/furniture"],beverages:["shop/alcohol","shop/beverages"],camping:["leisure/park","tourism/camp_site","tourism/caravan_site"],car_parts:["shop/car_parts","shop/car_repair","shop/tires","shop/tyres"],clinic:["amenity/clinic","amenity/doctors","healthcare/clinic","healthcare/dialysis"],confectionery:["shop/candy","shop/chocolate","shop/confectionery"],convenience:["shop/beauty","shop/chemist","shop/convenience","shop/cosmetics","shop/newsagent"],coworking:["amenity/coworking_space","office/coworking","office/coworking_space"],dentist:["amenity/dentist","amenity/doctors","healthcare/dentist"],electronics:["office/telecommunication","shop/computer","shop/electronics","shop/hifi","shop/mobile","shop/mobile_phone","shop/telecommunication"],fashion:["shop/accessories","shop/bag","shop/botique","shop/clothes","shop/department_store","shop/fashion","shop/fashion_accessories","shop/sports","shop/shoes"],financial:["amenity/bank","office/accountant","office/financial","office/financial_advisor","office/tax_advisor","shop/tax"],fitness:["leisure/fitness_centre","leisure/fitness_center","leisure/sports_centre","leisure/sports_center"],food:["amenity/pub","amenity/bar","amenity/cafe","amenity/fast_food","amenity/ice_cream","amenity/restaurant","shop/bakery","shop/ice_cream","shop/pastry","shop/tea","shop/coffee"],fuel:["amenity/fuel","shop/gas","shop/convenience;gas","shop/gas;convenience"],gift:["shop/gift","shop/card","shop/cards","shop/stationery"],hardware:["shop/carpet","shop/diy","shop/doityourself","shop/doors","shop/electrical","shop/flooring","shop/hardware","shop/power_tools","shop/tool_hire","shop/tools","shop/trade"],health_food:["shop/health","shop/health_food","shop/herbalist","shop/nutrition_supplements"],hobby:["shop/electronics","shop/hobby","shop/books","shop/games","shop/collector","shop/toys","shop/model","shop/video_games","shop/anime"],hospital:["amenity/doctors","amenity/hospital","healthcare/hospital"],houseware:["shop/houseware","shop/interior_decoration"],lodging:["tourism/hotel","tourism/motel"],money_transfer:["amenity/money_transfer","shop/money_transfer"],office_supplies:["shop/office_supplies","shop/stationary","shop/stationery"],outdoor:["shop/outdoor","shop/sports"],pharmacy:["amenity/doctors","amenity/pharmacy","healthcare/pharmacy"],playground:["amenity/theme_park","leisure/amusement_arcade","leisure/playground"],rental:["amenity/bicycle_rental","amenity/boat_rental","amenity/car_rental","amenity/truck_rental","amenity/vehicle_rental","shop/rental"],school:["amenity/childcare","amenity/college","amenity/kindergarten","amenity/language_school","amenity/prep_school","amenity/school","amenity/university"],supermarket:["shop/food","shop/frozen_food","shop/greengrocer","shop/grocery","shop/supermarket","shop/wholesale"],variety_store:["shop/variety_store","shop/discount","shop/convenience"],vending:["amenity/vending_machine","shop/vending_machine"],weight_loss:["amenity/doctors","amenity/weight_clinic","healthcare/counselling","leisure/fitness_centre","office/therapist","shop/beauty","shop/diet","shop/food","shop/health_food","shop/herbalist","shop/nutrition","shop/nutrition_supplements","shop/weight_loss"],wholesale:["shop/wholesale","shop/supermarket","shop/department_store"]};
  var require$$0 = {
  matchGroups: matchGroups
  };

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, basedir, module) {
  	return module = {
  		path: basedir,
  		exports: {},
  		require: function (path, base) {
  			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
  		}
  	}, fn(module, module.exports), module.exports;
  }

  function commonjsRequire () {
  	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
  }

  var quickselect = createCommonjsModule(function (module, exports) {
  (function (global, factory) {
  	 module.exports = factory() ;
  }(commonjsGlobal, (function () {
  function quickselect(arr, k, left, right, compare) {
      quickselectStep(arr, k, left || 0, right || (arr.length - 1), compare || defaultCompare);
  }

  function quickselectStep(arr, k, left, right, compare) {

      while (right > left) {
          if (right - left > 600) {
              var n = right - left + 1;
              var m = k - left + 1;
              var z = Math.log(n);
              var s = 0.5 * Math.exp(2 * z / 3);
              var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
              var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
              var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
              quickselectStep(arr, k, newLeft, newRight, compare);
          }

          var t = arr[k];
          var i = left;
          var j = right;

          swap(arr, left, k);
          if (compare(arr[right], t) > 0) swap(arr, left, right);

          while (i < j) {
              swap(arr, i, j);
              i++;
              j--;
              while (compare(arr[i], t) < 0) i++;
              while (compare(arr[j], t) > 0) j--;
          }

          if (compare(arr[left], t) === 0) swap(arr, left, j);
          else {
              j++;
              swap(arr, j, right);
          }

          if (j <= k) left = j + 1;
          if (k <= j) right = j - 1;
      }
  }

  function swap(arr, i, j) {
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
  }

  function defaultCompare(a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
  }

  return quickselect;

  })));
  });

  var rbush_1 = rbush;
  var _default = rbush;



  function rbush(maxEntries, format) {
      if (!(this instanceof rbush)) return new rbush(maxEntries, format);

      // max entries in a node is 9 by default; min node fill is 40% for best performance
      this._maxEntries = Math.max(4, maxEntries || 9);
      this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));

      if (format) {
          this._initFormat(format);
      }

      this.clear();
  }

  rbush.prototype = {

      all: function () {
          return this._all(this.data, []);
      },

      search: function (bbox) {

          var node = this.data,
              result = [],
              toBBox = this.toBBox;

          if (!intersects(bbox, node)) return result;

          var nodesToSearch = [],
              i, len, child, childBBox;

          while (node) {
              for (i = 0, len = node.children.length; i < len; i++) {

                  child = node.children[i];
                  childBBox = node.leaf ? toBBox(child) : child;

                  if (intersects(bbox, childBBox)) {
                      if (node.leaf) result.push(child);
                      else if (contains(bbox, childBBox)) this._all(child, result);
                      else nodesToSearch.push(child);
                  }
              }
              node = nodesToSearch.pop();
          }

          return result;
      },

      collides: function (bbox) {

          var node = this.data,
              toBBox = this.toBBox;

          if (!intersects(bbox, node)) return false;

          var nodesToSearch = [],
              i, len, child, childBBox;

          while (node) {
              for (i = 0, len = node.children.length; i < len; i++) {

                  child = node.children[i];
                  childBBox = node.leaf ? toBBox(child) : child;

                  if (intersects(bbox, childBBox)) {
                      if (node.leaf || contains(bbox, childBBox)) return true;
                      nodesToSearch.push(child);
                  }
              }
              node = nodesToSearch.pop();
          }

          return false;
      },

      load: function (data) {
          if (!(data && data.length)) return this;

          if (data.length < this._minEntries) {
              for (var i = 0, len = data.length; i < len; i++) {
                  this.insert(data[i]);
              }
              return this;
          }

          // recursively build the tree with the given data from scratch using OMT algorithm
          var node = this._build(data.slice(), 0, data.length - 1, 0);

          if (!this.data.children.length) {
              // save as is if tree is empty
              this.data = node;

          } else if (this.data.height === node.height) {
              // split root if trees have the same height
              this._splitRoot(this.data, node);

          } else {
              if (this.data.height < node.height) {
                  // swap trees if inserted one is bigger
                  var tmpNode = this.data;
                  this.data = node;
                  node = tmpNode;
              }

              // insert the small tree into the large tree at appropriate level
              this._insert(node, this.data.height - node.height - 1, true);
          }

          return this;
      },

      insert: function (item) {
          if (item) this._insert(item, this.data.height - 1);
          return this;
      },

      clear: function () {
          this.data = createNode([]);
          return this;
      },

      remove: function (item, equalsFn) {
          if (!item) return this;

          var node = this.data,
              bbox = this.toBBox(item),
              path = [],
              indexes = [],
              i, parent, index, goingUp;

          // depth-first iterative tree traversal
          while (node || path.length) {

              if (!node) { // go up
                  node = path.pop();
                  parent = path[path.length - 1];
                  i = indexes.pop();
                  goingUp = true;
              }

              if (node.leaf) { // check current node
                  index = findItem(item, node.children, equalsFn);

                  if (index !== -1) {
                      // item found, remove the item and condense tree upwards
                      node.children.splice(index, 1);
                      path.push(node);
                      this._condense(path);
                      return this;
                  }
              }

              if (!goingUp && !node.leaf && contains(node, bbox)) { // go down
                  path.push(node);
                  indexes.push(i);
                  i = 0;
                  parent = node;
                  node = node.children[0];

              } else if (parent) { // go right
                  i++;
                  node = parent.children[i];
                  goingUp = false;

              } else node = null; // nothing found
          }

          return this;
      },

      toBBox: function (item) { return item; },

      compareMinX: compareNodeMinX,
      compareMinY: compareNodeMinY,

      toJSON: function () { return this.data; },

      fromJSON: function (data) {
          this.data = data;
          return this;
      },

      _all: function (node, result) {
          var nodesToSearch = [];
          while (node) {
              if (node.leaf) result.push.apply(result, node.children);
              else nodesToSearch.push.apply(nodesToSearch, node.children);

              node = nodesToSearch.pop();
          }
          return result;
      },

      _build: function (items, left, right, height) {

          var N = right - left + 1,
              M = this._maxEntries,
              node;

          if (N <= M) {
              // reached leaf level; return leaf
              node = createNode(items.slice(left, right + 1));
              calcBBox(node, this.toBBox);
              return node;
          }

          if (!height) {
              // target height of the bulk-loaded tree
              height = Math.ceil(Math.log(N) / Math.log(M));

              // target number of root entries to maximize storage utilization
              M = Math.ceil(N / Math.pow(M, height - 1));
          }

          node = createNode([]);
          node.leaf = false;
          node.height = height;

          // split the items into M mostly square tiles

          var N2 = Math.ceil(N / M),
              N1 = N2 * Math.ceil(Math.sqrt(M)),
              i, j, right2, right3;

          multiSelect(items, left, right, N1, this.compareMinX);

          for (i = left; i <= right; i += N1) {

              right2 = Math.min(i + N1 - 1, right);

              multiSelect(items, i, right2, N2, this.compareMinY);

              for (j = i; j <= right2; j += N2) {

                  right3 = Math.min(j + N2 - 1, right2);

                  // pack each entry recursively
                  node.children.push(this._build(items, j, right3, height - 1));
              }
          }

          calcBBox(node, this.toBBox);

          return node;
      },

      _chooseSubtree: function (bbox, node, level, path) {

          var i, len, child, targetNode, area, enlargement, minArea, minEnlargement;

          while (true) {
              path.push(node);

              if (node.leaf || path.length - 1 === level) break;

              minArea = minEnlargement = Infinity;

              for (i = 0, len = node.children.length; i < len; i++) {
                  child = node.children[i];
                  area = bboxArea(child);
                  enlargement = enlargedArea(bbox, child) - area;

                  // choose entry with the least area enlargement
                  if (enlargement < minEnlargement) {
                      minEnlargement = enlargement;
                      minArea = area < minArea ? area : minArea;
                      targetNode = child;

                  } else if (enlargement === minEnlargement) {
                      // otherwise choose one with the smallest area
                      if (area < minArea) {
                          minArea = area;
                          targetNode = child;
                      }
                  }
              }

              node = targetNode || node.children[0];
          }

          return node;
      },

      _insert: function (item, level, isNode) {

          var toBBox = this.toBBox,
              bbox = isNode ? item : toBBox(item),
              insertPath = [];

          // find the best node for accommodating the item, saving all nodes along the path too
          var node = this._chooseSubtree(bbox, this.data, level, insertPath);

          // put the item into the node
          node.children.push(item);
          extend(node, bbox);

          // split on node overflow; propagate upwards if necessary
          while (level >= 0) {
              if (insertPath[level].children.length > this._maxEntries) {
                  this._split(insertPath, level);
                  level--;
              } else break;
          }

          // adjust bboxes along the insertion path
          this._adjustParentBBoxes(bbox, insertPath, level);
      },

      // split overflowed node into two
      _split: function (insertPath, level) {

          var node = insertPath[level],
              M = node.children.length,
              m = this._minEntries;

          this._chooseSplitAxis(node, m, M);

          var splitIndex = this._chooseSplitIndex(node, m, M);

          var newNode = createNode(node.children.splice(splitIndex, node.children.length - splitIndex));
          newNode.height = node.height;
          newNode.leaf = node.leaf;

          calcBBox(node, this.toBBox);
          calcBBox(newNode, this.toBBox);

          if (level) insertPath[level - 1].children.push(newNode);
          else this._splitRoot(node, newNode);
      },

      _splitRoot: function (node, newNode) {
          // split root node
          this.data = createNode([node, newNode]);
          this.data.height = node.height + 1;
          this.data.leaf = false;
          calcBBox(this.data, this.toBBox);
      },

      _chooseSplitIndex: function (node, m, M) {

          var i, bbox1, bbox2, overlap, area, minOverlap, minArea, index;

          minOverlap = minArea = Infinity;

          for (i = m; i <= M - m; i++) {
              bbox1 = distBBox(node, 0, i, this.toBBox);
              bbox2 = distBBox(node, i, M, this.toBBox);

              overlap = intersectionArea(bbox1, bbox2);
              area = bboxArea(bbox1) + bboxArea(bbox2);

              // choose distribution with minimum overlap
              if (overlap < minOverlap) {
                  minOverlap = overlap;
                  index = i;

                  minArea = area < minArea ? area : minArea;

              } else if (overlap === minOverlap) {
                  // otherwise choose distribution with minimum area
                  if (area < minArea) {
                      minArea = area;
                      index = i;
                  }
              }
          }

          return index;
      },

      // sorts node children by the best axis for split
      _chooseSplitAxis: function (node, m, M) {

          var compareMinX = node.leaf ? this.compareMinX : compareNodeMinX,
              compareMinY = node.leaf ? this.compareMinY : compareNodeMinY,
              xMargin = this._allDistMargin(node, m, M, compareMinX),
              yMargin = this._allDistMargin(node, m, M, compareMinY);

          // if total distributions margin value is minimal for x, sort by minX,
          // otherwise it's already sorted by minY
          if (xMargin < yMargin) node.children.sort(compareMinX);
      },

      // total margin of all possible split distributions where each node is at least m full
      _allDistMargin: function (node, m, M, compare) {

          node.children.sort(compare);

          var toBBox = this.toBBox,
              leftBBox = distBBox(node, 0, m, toBBox),
              rightBBox = distBBox(node, M - m, M, toBBox),
              margin = bboxMargin(leftBBox) + bboxMargin(rightBBox),
              i, child;

          for (i = m; i < M - m; i++) {
              child = node.children[i];
              extend(leftBBox, node.leaf ? toBBox(child) : child);
              margin += bboxMargin(leftBBox);
          }

          for (i = M - m - 1; i >= m; i--) {
              child = node.children[i];
              extend(rightBBox, node.leaf ? toBBox(child) : child);
              margin += bboxMargin(rightBBox);
          }

          return margin;
      },

      _adjustParentBBoxes: function (bbox, path, level) {
          // adjust bboxes along the given tree path
          for (var i = level; i >= 0; i--) {
              extend(path[i], bbox);
          }
      },

      _condense: function (path) {
          // go through the path, removing empty nodes and updating bboxes
          for (var i = path.length - 1, siblings; i >= 0; i--) {
              if (path[i].children.length === 0) {
                  if (i > 0) {
                      siblings = path[i - 1].children;
                      siblings.splice(siblings.indexOf(path[i]), 1);

                  } else this.clear();

              } else calcBBox(path[i], this.toBBox);
          }
      },

      _initFormat: function (format) {
          // data format (minX, minY, maxX, maxY accessors)

          // uses eval-type function compilation instead of just accepting a toBBox function
          // because the algorithms are very sensitive to sorting functions performance,
          // so they should be dead simple and without inner calls

          var compareArr = ['return a', ' - b', ';'];

          this.compareMinX = new Function('a', 'b', compareArr.join(format[0]));
          this.compareMinY = new Function('a', 'b', compareArr.join(format[1]));

          this.toBBox = new Function('a',
              'return {minX: a' + format[0] +
              ', minY: a' + format[1] +
              ', maxX: a' + format[2] +
              ', maxY: a' + format[3] + '};');
      }
  };

  function findItem(item, items, equalsFn) {
      if (!equalsFn) return items.indexOf(item);

      for (var i = 0; i < items.length; i++) {
          if (equalsFn(item, items[i])) return i;
      }
      return -1;
  }

  // calculate node's bbox from bboxes of its children
  function calcBBox(node, toBBox) {
      distBBox(node, 0, node.children.length, toBBox, node);
  }

  // min bounding rectangle of node children from k to p-1
  function distBBox(node, k, p, toBBox, destNode) {
      if (!destNode) destNode = createNode(null);
      destNode.minX = Infinity;
      destNode.minY = Infinity;
      destNode.maxX = -Infinity;
      destNode.maxY = -Infinity;

      for (var i = k, child; i < p; i++) {
          child = node.children[i];
          extend(destNode, node.leaf ? toBBox(child) : child);
      }

      return destNode;
  }

  function extend(a, b) {
      a.minX = Math.min(a.minX, b.minX);
      a.minY = Math.min(a.minY, b.minY);
      a.maxX = Math.max(a.maxX, b.maxX);
      a.maxY = Math.max(a.maxY, b.maxY);
      return a;
  }

  function compareNodeMinX(a, b) { return a.minX - b.minX; }
  function compareNodeMinY(a, b) { return a.minY - b.minY; }

  function bboxArea(a)   { return (a.maxX - a.minX) * (a.maxY - a.minY); }
  function bboxMargin(a) { return (a.maxX - a.minX) + (a.maxY - a.minY); }

  function enlargedArea(a, b) {
      return (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) *
             (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY));
  }

  function intersectionArea(a, b) {
      var minX = Math.max(a.minX, b.minX),
          minY = Math.max(a.minY, b.minY),
          maxX = Math.min(a.maxX, b.maxX),
          maxY = Math.min(a.maxY, b.maxY);

      return Math.max(0, maxX - minX) *
             Math.max(0, maxY - minY);
  }

  function contains(a, b) {
      return a.minX <= b.minX &&
             a.minY <= b.minY &&
             b.maxX <= a.maxX &&
             b.maxY <= a.maxY;
  }

  function intersects(a, b) {
      return b.minX <= a.maxX &&
             b.minY <= a.maxY &&
             b.maxX >= a.minX &&
             b.maxY >= a.minY;
  }

  function createNode(children) {
      return {
          children: children,
          height: 1,
          leaf: true,
          minX: Infinity,
          minY: Infinity,
          maxX: -Infinity,
          maxY: -Infinity
      };
  }

  // sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
  // combines selection algorithm with binary divide & conquer approach

  function multiSelect(arr, left, right, n, compare) {
      var stack = [left, right],
          mid;

      while (stack.length) {
          right = stack.pop();
          left = stack.pop();

          if (right - left <= n) continue;

          mid = left + Math.ceil((right - left) / n / 2) * n;
          quickselect(arr, mid, left, right, compare);

          stack.push(left, mid, mid, right);
      }
  }
  rbush_1.default = _default;

  var lineclip_1 = lineclip;

  lineclip.polyline = lineclip;
  lineclip.polygon = polygonclip;


  // Cohen-Sutherland line clippign algorithm, adapted to efficiently
  // handle polylines rather than just segments

  function lineclip(points, bbox, result) {

      var len = points.length,
          codeA = bitCode(points[0], bbox),
          part = [],
          i, a, b, codeB, lastCode;

      if (!result) result = [];

      for (i = 1; i < len; i++) {
          a = points[i - 1];
          b = points[i];
          codeB = lastCode = bitCode(b, bbox);

          while (true) {

              if (!(codeA | codeB)) { // accept
                  part.push(a);

                  if (codeB !== lastCode) { // segment went outside
                      part.push(b);

                      if (i < len - 1) { // start a new line
                          result.push(part);
                          part = [];
                      }
                  } else if (i === len - 1) {
                      part.push(b);
                  }
                  break;

              } else if (codeA & codeB) { // trivial reject
                  break;

              } else if (codeA) { // a outside, intersect with clip edge
                  a = intersect(a, b, codeA, bbox);
                  codeA = bitCode(a, bbox);

              } else { // b outside
                  b = intersect(a, b, codeB, bbox);
                  codeB = bitCode(b, bbox);
              }
          }

          codeA = lastCode;
      }

      if (part.length) result.push(part);

      return result;
  }

  // Sutherland-Hodgeman polygon clipping algorithm

  function polygonclip(points, bbox) {

      var result, edge, prev, prevInside, i, p, inside;

      // clip against each side of the clip rectangle
      for (edge = 1; edge <= 8; edge *= 2) {
          result = [];
          prev = points[points.length - 1];
          prevInside = !(bitCode(prev, bbox) & edge);

          for (i = 0; i < points.length; i++) {
              p = points[i];
              inside = !(bitCode(p, bbox) & edge);

              // if segment goes through the clip window, add an intersection
              if (inside !== prevInside) result.push(intersect(prev, p, edge, bbox));

              if (inside) result.push(p); // add a point if it's inside

              prev = p;
              prevInside = inside;
          }

          points = result;

          if (!points.length) break;
      }

      return result;
  }

  // intersect a segment against one of the 4 lines that make up the bbox

  function intersect(a, b, edge, bbox) {
      return edge & 8 ? [a[0] + (b[0] - a[0]) * (bbox[3] - a[1]) / (b[1] - a[1]), bbox[3]] : // top
             edge & 4 ? [a[0] + (b[0] - a[0]) * (bbox[1] - a[1]) / (b[1] - a[1]), bbox[1]] : // bottom
             edge & 2 ? [bbox[2], a[1] + (b[1] - a[1]) * (bbox[2] - a[0]) / (b[0] - a[0])] : // right
             edge & 1 ? [bbox[0], a[1] + (b[1] - a[1]) * (bbox[0] - a[0]) / (b[0] - a[0])] : // left
             null;
  }

  // bit code reflects the point position relative to the bbox:

  //         left  mid  right
  //    top  1001  1000  1010
  //    mid  0001  0000  0010
  // bottom  0101  0100  0110

  function bitCode(p, bbox) {
      var code = 0;

      if (p[0] < bbox[0]) code |= 1; // left
      else if (p[0] > bbox[2]) code |= 2; // right

      if (p[1] < bbox[1]) code |= 4; // bottom
      else if (p[1] > bbox[3]) code |= 8; // top

      return code;
  }

  var whichPolygon_1 = whichPolygon;

  function whichPolygon(data) {
      var bboxes = [];
      for (var i = 0; i < data.features.length; i++) {
          var feature = data.features[i];
          var coords = feature.geometry.coordinates;

          if (feature.geometry.type === 'Polygon') {
              bboxes.push(treeItem(coords, feature.properties));

          } else if (feature.geometry.type === 'MultiPolygon') {
              for (var j = 0; j < coords.length; j++) {
                  bboxes.push(treeItem(coords[j], feature.properties));
              }
          }
      }

      var tree = rbush_1().load(bboxes);

      function query(p, multi) {
          var output = [],
              result = tree.search({
                  minX: p[0],
                  minY: p[1],
                  maxX: p[0],
                  maxY: p[1]
              });
          for (var i = 0; i < result.length; i++) {
              if (insidePolygon(result[i].coords, p)) {
                  if (multi)
                      output.push(result[i].props);
                  else
                      return result[i].props;
              }
          }
          return multi && output.length ? output : null;
      }

      query.tree = tree;
      query.bbox = function queryBBox(bbox) {
          var output = [];
          var result = tree.search({
              minX: bbox[0],
              minY: bbox[1],
              maxX: bbox[2],
              maxY: bbox[3]
          });
          for (var i = 0; i < result.length; i++) {
              if (polygonIntersectsBBox(result[i].coords, bbox)) {
                  output.push(result[i].props);
              }
          }
          return output;
      };

      return query;
  }

  function polygonIntersectsBBox(polygon, bbox) {
      var bboxCenter = [
          (bbox[0] + bbox[2]) / 2,
          (bbox[1] + bbox[3]) / 2
      ];
      if (insidePolygon(polygon, bboxCenter)) return true;
      for (var i = 0; i < polygon.length; i++) {
          if (lineclip_1(polygon[i], bbox).length > 0) return true;
      }
      return false;
  }

  // ray casting algorithm for detecting if point is in polygon
  function insidePolygon(rings, p) {
      var inside = false;
      for (var i = 0, len = rings.length; i < len; i++) {
          var ring = rings[i];
          for (var j = 0, len2 = ring.length, k = len2 - 1; j < len2; k = j++) {
              if (rayIntersect(p, ring[j], ring[k])) inside = !inside;
          }
      }
      return inside;
  }

  function rayIntersect(p, p1, p2) {
      return ((p1[1] > p[1]) !== (p2[1] > p[1])) && (p[0] < (p2[0] - p1[0]) * (p[1] - p1[1]) / (p2[1] - p1[1]) + p1[0]);
  }

  function treeItem(coords, props) {
      var item = {
          minX: Infinity,
          minY: Infinity,
          maxX: -Infinity,
          maxY: -Infinity,
          coords: coords,
          props: props
      };

      for (var i = 0; i < coords[0].length; i++) {
          var p = coords[0][i];
          item.minX = Math.min(item.minX, p[0]);
          item.minY = Math.min(item.minY, p[1]);
          item.maxX = Math.max(item.maxX, p[0]);
          item.maxY = Math.max(item.maxY, p[1]);
      }
      return item;
  }

  const matchGroups$1 = require$$0.matchGroups;



  var matcher = () => {

    // The `matchIndex` is a specialized structure that allows us to quickly answer
    //   _"Given a [key/value tagpair, name, location], what canonical items (brands etc) can match it?"_
    //
    // The index contains all valid combinations of
    // primary/alternate tagpairs and primary/alternate names
    //
    // matchIndex:
    // {
    //    'amenity/bank': {
    //      '1stbank':          Set ("firstbank-f17495"),
    //      'firstbank':        Set ("firstbank-978cca", "firstbank-9794e6", "firstbank-f17495", …),
    //      …
    //    },
    //    'shop/supermarket': {
    //      'coop':                   Set ("coop-76454b", "coopfood-a8278b", "coop-ebf2d9", "coop-36e991", …),
    //      'coopfood':               Set ("coopfood-a8278b"),
    //      'federatedcooperatives':  Set ("coop-76454b"),
    //      'thecooperative':         Set ("coopfood-a8278b"),
    //      …
    //    },
    //    …
    // }
    let _matchIndex;

    // The `_itemToLocation` structure maps itemIDs to locationSetIDs:
    // {
    //   'firstbank-f17495':  '+[first_bank_western_us.geojson]',
    //   'firstbank-978cca':  '+[first_bank_carolinas.geojson]',
    //   'coop-76454b':       '+[Q16]',
    //   'coopfood-a8278b':   '+[Q23666]',
    //   …
    // }
    let _itemToLocation;

    // the _locationIndex is an instance of which-polygon spatial index for the location sets.
    let _locationIndex;

    let _warnings = [];    // array of match conflict pairs
    let matcher = {};


    //
    // buildMatchIndex()
    // Call this to prepare the matcher for use
    //
    // `all` needs to be an Object indexed on a 'tree/key/value' path.
    // (The cache in `file_tree.js` and `build_brands.js` makes this)
    // {
    //    'brands/amenity/bank': [ {}, {}, … ],
    //    'brands/amenity/bar':  [ {}, {}, … ],
    //    …
    // }
    //
    matcher.buildMatchIndex = (all, loco) => {
      if (_matchIndex) return;   // it was built already
      _matchIndex = {};
      _itemToLocation = {};

      Object.keys(all).forEach(tkv => {
        let items = all[tkv];
        if (!Array.isArray(items) || !items.length) return;

        const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
        const t = parts[0];
        const k = parts[1];
        const v = parts[2];

        // Perform two passes - first gather primary name tag, then gather secondary/alternate names
        items.forEach(item => _indexItem(t, k, v, item, 'primary'));
        items.forEach(item => _indexItem(t, k, v, item, 'secondary'));
      });


      function _indexItem(t, k, v, item, which) {
        if (!item.id) return;
        const tags = item.tags;
        const thiskv = `${k}/${v}`;

        // First time - perform some setup steps on this item before anything else.
        if (which === 'primary') {
          // 1. index this item's locationSetID..
          _itemToLocation[item.id] = loco.validateLocationSet(item.locationSet).id;

          // 2. Automatically remove redundant `matchTags` - #3417
          // (i.e. This kv is already covered by matchGroups, so it doesn't need to be in `item.matchTags`)
          if (Array.isArray(item.matchTags) && item.matchTags.length) {
            Object.values(matchGroups$1).forEach(matchGroup => {
              const inGroup = matchGroup.some(matchkv => matchkv === thiskv);
              if (!inGroup) return;

              // keep matchTags *not* already in match group
              item.matchTags = item.matchTags
                .filter(matchTag => !matchGroup.some(matchkv => matchkv === matchTag));
            });

            if (!item.matchTags.length) delete item.matchTags;
          }
        }


        // Look for tags to insert..
        let kvTags = [
          `${thiskv}`,
          `${k}/yes`,          // #3454 - match some generic tags
          'building/yes'       // #3454 - match some generic tags
        ].concat(item.matchTags || []);

        // Look for names to insert..
        let nameTags = [];
        if (which === 'primary') {
          nameTags = [/^name$/];

        } else if (which === 'secondary') {          // #2732 - match alternate names
          nameTags = [
            /^(brand|operator|network)$/,
            /^\w+_name$/,                            // e.g. `alt_name`, `short_name`
            /^(name|brand|operator|network):\w+$/,   // e.g. `name:en`, `name:ru`
            /^\w+_name:\w+$/                         // e.g. `alt_name:en`, `short_name:ru`
          ];
        }

        kvTags.forEach(kv => {
          if (!_matchIndex[kv])  _matchIndex[kv] = {};

          nameTags.forEach(nameTag => {
            const re = new RegExp(nameTag, 'i');
            Object.keys(tags).forEach(osmkey => {
              if (!re.test(osmkey)) return;    // osmkey is not a name tag, skip

              // There are a few exceptions to the nameTag matching regexes.
              // Usually a tag suffix contains a language code like `name:en`, `name:ru`
              // but we want to exclude things like `operator:type`, `name:etymology`, etc..
              if (/:(type|left|right|etymology)$/.test(osmkey)) return;

              const name = tags[osmkey];
              const nsimple = simplify(name);
              if (!_matchIndex[kv][nsimple])  _matchIndex[kv][nsimple] = new Set();

              let set = _matchIndex[kv][nsimple];
              if (set.has(item.id)) {
                // Warn if we detect collisions on `name` tag.
                // For example, multiple items with the same k/v that simplify to the same simplename
                // "Bed Bath & Beyond" and "Bed Bath and Beyond"
                if (osmkey === 'name') {
                  _warnings.push([item.id, `${item.id} (${kv}/${nsimple})`]);
                }
              } else {
                set.add(item.id);
              }
            });
          });

          // check `matchNames` after indexing all other names
          if (which === 'secondary') {
            let keepMatchNames = [];

            (item.matchNames || []).forEach(matchName => {
              const nsimple = simplify(matchName);
              if (!_matchIndex[kv][nsimple])  _matchIndex[kv][nsimple] = new Set();

              let set = _matchIndex[kv][nsimple];
              if (!set.has(item.id)) {
                set.add(item.id);
                keepMatchNames.push(matchName);
              }
            });

            // Automatically remove redundant `matchNames` - #3417
            // (i.e. This name got indexed some other way, so it doesn't need to be in `item.matchNames`)
            if (keepMatchNames.length) {
              item.matchNames = keepMatchNames;
            } else {
              delete item.matchNames;
            }
          }

        });
      }
    };


    //
    // buildLocationIndex()
    // Call this to prepare a which-polygon location index.
    // You can skip this step if you don't care about location.
    //
    matcher.buildLocationIndex = (all, loco) => {
      if (_locationIndex) return;   // it was built already

      let locationSets = {};
      Object.keys(all).forEach(tkv => {
        let items = all[tkv];
        if (!Array.isArray(items) || !items.length) return;

        items.forEach(item => {
          let feature = loco.resolveLocationSet(item.locationSet).feature;
          locationSets[feature.id] = feature;
        });
      });

      _locationIndex = whichPolygon_1({ type: 'FeatureCollection', features: Object.values(locationSets) });
    };


    //
    // match()
    // Pass parts and return an array of matches.
    // `k` - key
    // `v` - value
    // `n` - name
    // `loc` - optional - [lon,lat] location to search
    //
    // Returns an array of matches, or null if no match
    //
    matcher.match = (k, v, n, loc) => {
      if (!_matchIndex) {
        throw new Error('match:  matchIndex not built.');
      }

      // If we were supplied a location, and a locationIndex has been set up,
      // get the locationSets that are valid there so we can filter results.
      let filterLocations;
      if (Array.isArray(loc) && _locationIndex) {
        filterLocations = new Set(_locationIndex([loc[0], loc[1], loc[0], loc[1]], true).map(props => props.id));
      }

      const kv = `${k}/${v}`;
      const nsimple = simplify(n);

      // Look for an exact match on kv..
      let m = _tryMatch(kv, nsimple);
      if (m) return m;

      // Look in match groups for other pairs considered equivalent to kv..
      for (let mg in matchGroups$1) {
        const matchGroup = matchGroups$1[mg];
        const inGroup = matchGroup.some(otherkv => otherkv === kv);
        if (!inGroup) continue;

        for (let i = 0; i < matchGroup.length; i++) {
          const otherkv = matchGroup[i];
          if (otherkv === kv) continue;  // skip self
          m = _tryMatch(otherkv, nsimple);
          if (m) return m;
        }
      }

      // didn't match anything
      return null;


      function _tryMatch(kv, nsimple) {
        if (!_matchIndex[kv]) return null;

        let m = _matchIndex[kv][nsimple];
        if (!m) return null;

        let itemIDs = Array.from(m);

        // Filter the match to include only results valid in that location.
        if (filterLocations) {
          itemIDs = itemIDs.filter(itemID => filterLocations.has(_itemToLocation[itemID]));
        }

        return itemIDs.length ? itemIDs : null;
      }
    };


    //
    // getWarnings()
    // Return any warnings discovered when buiding the index.
    //
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

  Object.defineProperty(exports, '__esModule', { value: true });

})));
