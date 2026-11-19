{
  "format": "electrocraft",
  "version": 1,
  "name": "Two-section board",
  "author": "ElectroCraft examples",
  "revision": "A",
  "created": "2026-11-19T19:59:58.713Z",
  "modified": "2026-11-19T19:59:58.714Z",
  "settings": {
    "markingStandard": "iec81346",
    "phaseColors": {
      "L1": "brown",
      "L2": "black",
      "L3": "grey"
    },
    "usPhaseColors": {
      "L1": "black",
      "L2": "red",
      "L3": "blue"
    }
  },
  "panels": [
    {
      "id": "ph8ix3by",
      "name": "Distribution board",
      "floor": "Ground floor",
      "room": "Utility room",
      "code": "DB1",
      "rails": [
        {
          "id": "r-a1",
          "modules": 12
        },
        {
          "id": "r-a2",
          "modules": 12
        },
        {
          "id": "rlawrqqq",
          "modules": 18,
          "section": "spjz9ftq"
        },
        {
          "id": "reo8tcvq",
          "modules": 18,
          "section": "spjz9ftq"
        }
      ],
      "items": [
        {
          "id": "ip44e09l",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "count": 10,
            "role": "N",
            "In": 100
          },
          "on": true,
          "description": "Neutral bar",
          "manufacturer": "",
          "model": "",
          "bar": {
            "section": "main",
            "edge": "top"
          }
        },
        {
          "id": "ipr2mn48",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "count": 10,
            "role": "PE",
            "In": 100
          },
          "on": true,
          "description": "Earth bar",
          "manufacturer": "",
          "model": "",
          "bar": {
            "section": "main",
            "edge": "top"
          }
        },
        {
          "id": "i80q8oqv",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "count": 16,
            "role": "N",
            "In": 100
          },
          "on": true,
          "description": "Neutral bar",
          "manufacturer": "",
          "model": "",
          "bar": {
            "section": "spjz9ftq",
            "edge": "bottom"
          }
        },
        {
          "id": "ikv09k2j",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "count": 16,
            "role": "PE",
            "In": 100
          },
          "on": true,
          "description": "Earth bar",
          "manufacturer": "",
          "model": "",
          "bar": {
            "section": "spjz9ftq",
            "edge": "bottom"
          }
        },
        {
          "id": "i4bzwa1i",
          "defId": "supply",
          "x": 60,
          "y": -300,
          "poleConfig": "1P",
          "params": {
            "phases": 1,
            "In": 32,
            "Un": 230,
            "feeder": "5x10 mm²"
          },
          "on": true,
          "description": "Incoming supply",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "iv5bsucn",
          "defId": "isolator",
          "x": 0,
          "y": 0,
          "poleConfig": "2P",
          "params": {
            "In": 63,
            "Un": 400
          },
          "on": true,
          "description": "Main switch",
          "manufacturer": "",
          "model": "",
          "railId": "r-a1",
          "slot": 0
        },
        {
          "id": "i4d9w0mt",
          "defId": "rcd",
          "x": 0,
          "y": 0,
          "poleConfig": "2P",
          "params": {
            "In": 40,
            "IdN": 30,
            "type": "A",
            "Un": 230
          },
          "on": true,
          "description": "Residual current protection",
          "manufacturer": "",
          "model": "",
          "railId": "r-a2",
          "slot": 0
        },
        {
          "id": "i9w8yqh5",
          "defId": "mcb",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 10,
            "curve": "B",
            "Icn": 6000,
            "Un": 230
          },
          "on": true,
          "description": "Lighting",
          "manufacturer": "",
          "model": "",
          "railId": "rlawrqqq",
          "slot": 0
        },
        {
          "id": "ie5wb2nw",
          "defId": "mcb",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 16,
            "curve": "B",
            "Icn": 6000,
            "Un": 230
          },
          "on": true,
          "description": "Sockets",
          "manufacturer": "",
          "model": "",
          "railId": "rlawrqqq",
          "slot": 1
        },
        {
          "id": "i1yzvsfq",
          "defId": "mcb",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 16,
            "curve": "B",
            "Icn": 6000,
            "Un": 230
          },
          "on": true,
          "description": "Oven",
          "manufacturer": "",
          "model": "",
          "railId": "reo8tcvq",
          "slot": 0
        },
        {
          "id": "irkntrry",
          "defId": "mcb",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 10,
            "curve": "B",
            "Icn": 6000,
            "Un": 230
          },
          "on": true,
          "description": "Garden lights",
          "manufacturer": "",
          "model": "",
          "railId": "reo8tcvq",
          "slot": 1
        },
        {
          "id": "iorlmvsi",
          "defId": "load",
          "x": 366,
          "y": 486,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 600,
            "cosphi": 1
          },
          "on": true,
          "description": "Lighting",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "il0ff0dl",
          "defId": "load",
          "x": 496,
          "y": 486,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 2300,
            "cosphi": 1
          },
          "on": true,
          "description": "Sockets",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "i9c81e3b",
          "defId": "load",
          "x": 626,
          "y": 486,
          "poleConfig": "1P",
          "params": {
            "kind": "heater",
            "phases": 1,
            "P": 3000,
            "cosphi": 1
          },
          "on": true,
          "description": "Oven",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "idn90fuj",
          "defId": "load",
          "x": 756,
          "y": 486,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 300,
            "cosphi": 1
          },
          "on": true,
          "description": "Garden lights",
          "manufacturer": "",
          "model": ""
        }
      ],
      "wires": [
        {
          "id": "w761zsrc",
          "from": {
            "item": "i4bzwa1i",
            "terminal": "L1"
          },
          "to": {
            "item": "iv5bsucn",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wn18zwlg",
          "from": {
            "item": "i4bzwa1i",
            "terminal": "N"
          },
          "to": {
            "item": "iv5bsucn",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wryfj6ad",
          "from": {
            "item": "i4bzwa1i",
            "terminal": "PE"
          },
          "to": {
            "item": "ipr2mn48",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "woe3pfrw",
          "from": {
            "item": "iv5bsucn",
            "terminal": "B0"
          },
          "to": {
            "item": "i4d9w0mt",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wedau925",
          "from": {
            "item": "iv5bsucn",
            "terminal": "B1"
          },
          "to": {
            "item": "i4d9w0mt",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wihwuxmh",
          "from": {
            "item": "i4d9w0mt",
            "terminal": "B1"
          },
          "to": {
            "item": "ip44e09l",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "www61rla",
          "from": {
            "item": "i4d9w0mt",
            "terminal": "B0"
          },
          "to": {
            "item": "i9w8yqh5",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wxvt8psl",
          "from": {
            "item": "i4d9w0mt",
            "terminal": "B0"
          },
          "to": {
            "item": "ie5wb2nw",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wp0fnt97",
          "from": {
            "item": "i4d9w0mt",
            "terminal": "B0"
          },
          "to": {
            "item": "i1yzvsfq",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wn4dnho6",
          "from": {
            "item": "i4d9w0mt",
            "terminal": "B0"
          },
          "to": {
            "item": "irkntrry",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w7rfj3ty",
          "from": {
            "item": "ip44e09l",
            "terminal": "B1"
          },
          "to": {
            "item": "i80q8oqv",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 6
        },
        {
          "id": "wqrcbm7t",
          "from": {
            "item": "ipr2mn48",
            "terminal": "B1"
          },
          "to": {
            "item": "ikv09k2j",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 6
        },
        {
          "id": "w7zp2o88",
          "from": {
            "item": "i9w8yqh5",
            "terminal": "B0"
          },
          "to": {
            "item": "iorlmvsi",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wk9jcqu8",
          "from": {
            "item": "i80q8oqv",
            "terminal": "T1"
          },
          "to": {
            "item": "iorlmvsi",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wz1m9kem",
          "from": {
            "item": "ikv09k2j",
            "terminal": "T1"
          },
          "to": {
            "item": "iorlmvsi",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wypngqnj",
          "from": {
            "item": "ie5wb2nw",
            "terminal": "B0"
          },
          "to": {
            "item": "il0ff0dl",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wivgtoe8",
          "from": {
            "item": "i80q8oqv",
            "terminal": "T2"
          },
          "to": {
            "item": "il0ff0dl",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wb11p0tg",
          "from": {
            "item": "ikv09k2j",
            "terminal": "T2"
          },
          "to": {
            "item": "il0ff0dl",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "ws247ils",
          "from": {
            "item": "i1yzvsfq",
            "terminal": "B0"
          },
          "to": {
            "item": "i9c81e3b",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "welpugyk",
          "from": {
            "item": "i80q8oqv",
            "terminal": "T3"
          },
          "to": {
            "item": "i9c81e3b",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wrugnrez",
          "from": {
            "item": "ikv09k2j",
            "terminal": "T3"
          },
          "to": {
            "item": "i9c81e3b",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wcvyysrb",
          "from": {
            "item": "irkntrry",
            "terminal": "B0"
          },
          "to": {
            "item": "idn90fuj",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wzoaoymo",
          "from": {
            "item": "i80q8oqv",
            "terminal": "T4"
          },
          "to": {
            "item": "idn90fuj",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "ww1btlr2",
          "from": {
            "item": "ikv09k2j",
            "terminal": "T4"
          },
          "to": {
            "item": "idn90fuj",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        }
      ],
      "notes": "",
      "sections": [
        {
          "id": "main",
          "name": "Section 1"
        },
        {
          "id": "spjz9ftq",
          "name": "Section 2"
        }
      ]
    }
  ],
  "modules": []
}