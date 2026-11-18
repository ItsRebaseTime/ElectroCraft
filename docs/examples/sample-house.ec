{
  "format": "electrocraft",
  "version": 1,
  "name": "Sample house",
  "author": "",
  "revision": "A",
  "created": "2026-11-18T20:40:21.483Z",
  "modified": "2026-11-18T20:40:21.484Z",
  "settings": {
    "markingStandard": "iec81346",
    "phaseColors": {
      "L1": "brown",
      "L2": "black",
      "L3": "grey"
    }
  },
  "panels": [
    {
      "id": "ptt902e8",
      "name": "Flat board",
      "floor": "Ground floor",
      "room": "Hallway",
      "code": "DB1",
      "rails": [
        {
          "id": "rn4idyh0",
          "modules": 12
        },
        {
          "id": "ri53ofbm",
          "modules": 12
        },
        {
          "id": "r-bottom",
          "modules": 12
        }
      ],
      "items": [
        {
          "id": "il7414bn",
          "defId": "supply",
          "x": 60,
          "y": -240,
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
          "id": "iyo0a81f",
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
          "railId": "rn4idyh0",
          "slot": 0
        },
        {
          "id": "in80a65b",
          "defId": "spd",
          "x": 0,
          "y": 0,
          "poleConfig": "1P+N",
          "params": {
            "type": "2",
            "Uc": 275,
            "Imax": 40
          },
          "on": true,
          "description": "Surge protection",
          "manufacturer": "",
          "model": "",
          "railId": "rn4idyh0",
          "slot": 4
        },
        {
          "id": "i5pfklqk",
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
          "railId": "ri53ofbm",
          "slot": 0
        },
        {
          "id": "ikn6m67p",
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
          "railId": "r-bottom",
          "slot": 0
        },
        {
          "id": "i2sqgl3i",
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
          "railId": "r-bottom",
          "slot": 1
        },
        {
          "id": "iy4yt4k5",
          "defId": "mcb",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 16,
            "curve": "C",
            "Icn": 6000,
            "Un": 230
          },
          "on": true,
          "description": "Oven",
          "manufacturer": "",
          "model": "",
          "railId": "r-bottom",
          "slot": 2
        },
        {
          "id": "i7cmh4ex",
          "defId": "indicator",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "color": "green",
            "Un": 230
          },
          "on": true,
          "description": "Power on",
          "manufacturer": "",
          "model": "",
          "railId": "r-bottom",
          "slot": 3
        },
        {
          "id": "i7wwwnql",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "count": 6,
            "role": "N",
            "In": 100
          },
          "on": true,
          "description": "Neutral bar",
          "manufacturer": "",
          "model": "",
          "railId": "r-bottom",
          "slot": 5
        },
        {
          "id": "ivbsonr3",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "count": 6,
            "role": "PE",
            "In": 100
          },
          "on": true,
          "description": "Earth bar",
          "manufacturer": "",
          "model": "",
          "railId": "r-bottom",
          "slot": 8.5
        },
        {
          "id": "irac0qen",
          "defId": "load",
          "x": 0,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 600,
            "cosphi": 1
          },
          "on": true,
          "description": "Ceiling lights",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "isg5fu5v",
          "defId": "load",
          "x": 130,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 2300,
            "cosphi": 1
          },
          "on": true,
          "description": "Kitchen sockets",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "i9ivnjll",
          "defId": "load",
          "x": 260,
          "y": 590,
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
        }
      ],
      "wires": [
        {
          "id": "wf3ocp6n",
          "from": {
            "item": "il7414bn",
            "terminal": "L1"
          },
          "to": {
            "item": "iyo0a81f",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wdel6roa",
          "from": {
            "item": "il7414bn",
            "terminal": "N"
          },
          "to": {
            "item": "iyo0a81f",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wqk6yado",
          "from": {
            "item": "il7414bn",
            "terminal": "PE"
          },
          "to": {
            "item": "ivbsonr3",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w2amrr37",
          "from": {
            "item": "iyo0a81f",
            "terminal": "B0"
          },
          "to": {
            "item": "i5pfklqk",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wtzgmku9",
          "from": {
            "item": "iyo0a81f",
            "terminal": "B1"
          },
          "to": {
            "item": "i5pfklqk",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wmiqpgej",
          "from": {
            "item": "iyo0a81f",
            "terminal": "B0"
          },
          "to": {
            "item": "in80a65b",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 6
        },
        {
          "id": "woywoj1z",
          "from": {
            "item": "iyo0a81f",
            "terminal": "B1"
          },
          "to": {
            "item": "in80a65b",
            "terminal": "B1"
          },
          "color": "auto",
          "nodes": null,
          "section": 6
        },
        {
          "id": "wp3xqu6m",
          "from": {
            "item": "i5pfklqk",
            "terminal": "B0"
          },
          "to": {
            "item": "ikn6m67p",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wcrg0o3n",
          "from": {
            "item": "i5pfklqk",
            "terminal": "B0"
          },
          "to": {
            "item": "i2sqgl3i",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wggxmcha",
          "from": {
            "item": "i5pfklqk",
            "terminal": "B0"
          },
          "to": {
            "item": "iy4yt4k5",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w8fecnvf",
          "from": {
            "item": "i5pfklqk",
            "terminal": "B0"
          },
          "to": {
            "item": "i7cmh4ex",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w59x9ccu",
          "from": {
            "item": "i5pfklqk",
            "terminal": "B1"
          },
          "to": {
            "item": "i7wwwnql",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w9h0h50e",
          "from": {
            "item": "i7cmh4ex",
            "terminal": "B0"
          },
          "to": {
            "item": "i7wwwnql",
            "terminal": "B1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wavpsufu",
          "from": {
            "item": "ikn6m67p",
            "terminal": "B0"
          },
          "to": {
            "item": "irac0qen",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w3fn6y3e",
          "from": {
            "item": "i2sqgl3i",
            "terminal": "B0"
          },
          "to": {
            "item": "isg5fu5v",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w1cnanof",
          "from": {
            "item": "iy4yt4k5",
            "terminal": "B0"
          },
          "to": {
            "item": "i9ivnjll",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w1afhfqb",
          "from": {
            "item": "i7wwwnql",
            "terminal": "B2"
          },
          "to": {
            "item": "irac0qen",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w13mz2pt",
          "from": {
            "item": "i7wwwnql",
            "terminal": "B3"
          },
          "to": {
            "item": "isg5fu5v",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w57dla4f",
          "from": {
            "item": "i7wwwnql",
            "terminal": "B4"
          },
          "to": {
            "item": "i9ivnjll",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wkyh8jq4",
          "from": {
            "item": "ivbsonr3",
            "terminal": "B1"
          },
          "to": {
            "item": "irac0qen",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w4tc3b48",
          "from": {
            "item": "ivbsonr3",
            "terminal": "B2"
          },
          "to": {
            "item": "isg5fu5v",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wzob10sx",
          "from": {
            "item": "ivbsonr3",
            "terminal": "B3"
          },
          "to": {
            "item": "i9ivnjll",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        }
      ],
      "notes": ""
    },
    {
      "id": "pyu79oqh",
      "name": "Workshop board",
      "floor": "First floor",
      "room": "Workshop",
      "code": "DB2",
      "rails": [
        {
          "id": "rysnv95e",
          "modules": 12
        },
        {
          "id": "rmyzd3uy",
          "modules": 12
        },
        {
          "id": "r-ws-3",
          "modules": 12
        },
        {
          "id": "r-ws-4",
          "modules": 12
        }
      ],
      "items": [
        {
          "id": "i88y1zpi",
          "defId": "supply",
          "x": 60,
          "y": -240,
          "poleConfig": "1P",
          "params": {
            "phases": 3,
            "In": 40,
            "Un": 230,
            "feeder": "5x10 mm²"
          },
          "on": true,
          "description": "Incoming supply",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "i6ljjlr0",
          "defId": "isolator",
          "x": 0,
          "y": 0,
          "poleConfig": "3P+N",
          "params": {
            "In": 63,
            "Un": 400
          },
          "on": true,
          "description": "Main switch",
          "manufacturer": "",
          "model": "",
          "railId": "rysnv95e",
          "slot": 0
        },
        {
          "id": "i78u1bg5",
          "defId": "rcd",
          "x": 0,
          "y": 0,
          "poleConfig": "4P",
          "params": {
            "In": 40,
            "IdN": 30,
            "type": "A",
            "Un": 400
          },
          "on": true,
          "description": "RCD",
          "manufacturer": "",
          "model": "",
          "railId": "rmyzd3uy",
          "slot": 0
        },
        {
          "id": "ilsr36az",
          "defId": "mcb",
          "x": 0,
          "y": 0,
          "poleConfig": "3P",
          "params": {
            "In": 10,
            "curve": "C",
            "Icn": 6000,
            "Un": 400
          },
          "on": true,
          "description": "Motor",
          "manufacturer": "",
          "model": "",
          "railId": "r-ws-3",
          "slot": 0
        },
        {
          "id": "ivfcr1um",
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
          "railId": "r-ws-3",
          "slot": 3
        },
        {
          "id": "is0csfuo",
          "defId": "indicator",
          "x": 0,
          "y": 0,
          "poleConfig": "3P",
          "params": {
            "color": "green",
            "Un": 400
          },
          "on": true,
          "description": "Phases present",
          "manufacturer": "",
          "model": "",
          "railId": "r-ws-3",
          "slot": 4.5
        },
        {
          "id": "iiafoblc",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "count": 4,
            "role": "N",
            "In": 100
          },
          "on": true,
          "description": "Neutral bar",
          "manufacturer": "",
          "model": "",
          "railId": "r-ws-3",
          "slot": 8
        },
        {
          "id": "i3pbu7ru",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "count": 6,
            "role": "PE",
            "In": 100
          },
          "on": true,
          "description": "Earth bar",
          "manufacturer": "",
          "model": "",
          "railId": "r-ws-4",
          "slot": 0
        },
        {
          "id": "i3qty6ty",
          "defId": "load",
          "x": 0,
          "y": 770,
          "poleConfig": "1P",
          "params": {
            "kind": "motor",
            "phases": 3,
            "P": 4000,
            "cosphi": 0.85
          },
          "on": true,
          "description": "Drill press",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "ifcylser",
          "defId": "load",
          "x": 140,
          "y": 770,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 400,
            "cosphi": 1
          },
          "on": true,
          "description": "Workshop lights",
          "manufacturer": "",
          "model": ""
        }
      ],
      "wires": [
        {
          "id": "w2kr2feh",
          "from": {
            "item": "i88y1zpi",
            "terminal": "L1"
          },
          "to": {
            "item": "i6ljjlr0",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wuxh0g4v",
          "from": {
            "item": "i88y1zpi",
            "terminal": "L2"
          },
          "to": {
            "item": "i6ljjlr0",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wa42na7t",
          "from": {
            "item": "i88y1zpi",
            "terminal": "L3"
          },
          "to": {
            "item": "i6ljjlr0",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wxyhxv9x",
          "from": {
            "item": "i88y1zpi",
            "terminal": "N"
          },
          "to": {
            "item": "i6ljjlr0",
            "terminal": "T3"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wwpm1lju",
          "from": {
            "item": "i88y1zpi",
            "terminal": "PE"
          },
          "to": {
            "item": "i3pbu7ru",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w3sat97i",
          "from": {
            "item": "i6ljjlr0",
            "terminal": "B0"
          },
          "to": {
            "item": "i78u1bg5",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wbwsbsno",
          "from": {
            "item": "i6ljjlr0",
            "terminal": "B1"
          },
          "to": {
            "item": "i78u1bg5",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w57abqix",
          "from": {
            "item": "i6ljjlr0",
            "terminal": "B2"
          },
          "to": {
            "item": "i78u1bg5",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wvnujdxk",
          "from": {
            "item": "i6ljjlr0",
            "terminal": "B3"
          },
          "to": {
            "item": "i78u1bg5",
            "terminal": "T3"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wxxnpe4x",
          "from": {
            "item": "i78u1bg5",
            "terminal": "B0"
          },
          "to": {
            "item": "ilsr36az",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w7nxwblc",
          "from": {
            "item": "i78u1bg5",
            "terminal": "B1"
          },
          "to": {
            "item": "ilsr36az",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wk918997",
          "from": {
            "item": "i78u1bg5",
            "terminal": "B2"
          },
          "to": {
            "item": "ilsr36az",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wb9su5ik",
          "from": {
            "item": "i78u1bg5",
            "terminal": "B0"
          },
          "to": {
            "item": "is0csfuo",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wb3vntvj",
          "from": {
            "item": "i78u1bg5",
            "terminal": "B1"
          },
          "to": {
            "item": "is0csfuo",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wothmkto",
          "from": {
            "item": "i78u1bg5",
            "terminal": "B2"
          },
          "to": {
            "item": "is0csfuo",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wcdvmxo5",
          "from": {
            "item": "i78u1bg5",
            "terminal": "B0"
          },
          "to": {
            "item": "ivfcr1um",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w87wm8sx",
          "from": {
            "item": "i78u1bg5",
            "terminal": "B3"
          },
          "to": {
            "item": "iiafoblc",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wqj90qip",
          "from": {
            "item": "is0csfuo",
            "terminal": "B0"
          },
          "to": {
            "item": "iiafoblc",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wj9q4g0l",
          "from": {
            "item": "is0csfuo",
            "terminal": "B1"
          },
          "to": {
            "item": "iiafoblc",
            "terminal": "B1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wrbju3ps",
          "from": {
            "item": "is0csfuo",
            "terminal": "B2"
          },
          "to": {
            "item": "iiafoblc",
            "terminal": "B2"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "ww3rge5f",
          "from": {
            "item": "ilsr36az",
            "terminal": "B0"
          },
          "to": {
            "item": "i3qty6ty",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w78ei13y",
          "from": {
            "item": "ilsr36az",
            "terminal": "B1"
          },
          "to": {
            "item": "i3qty6ty",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w0rcyc5p",
          "from": {
            "item": "ilsr36az",
            "terminal": "B2"
          },
          "to": {
            "item": "i3qty6ty",
            "terminal": "L3"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w7z2icow",
          "from": {
            "item": "ivfcr1um",
            "terminal": "B0"
          },
          "to": {
            "item": "ifcylser",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wpnj1996",
          "from": {
            "item": "iiafoblc",
            "terminal": "B3"
          },
          "to": {
            "item": "ifcylser",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wxukaar4",
          "from": {
            "item": "i3pbu7ru",
            "terminal": "B1"
          },
          "to": {
            "item": "i3qty6ty",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wdn5wbig",
          "from": {
            "item": "i3pbu7ru",
            "terminal": "B2"
          },
          "to": {
            "item": "ifcylser",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        }
      ],
      "notes": ""
    }
  ]
}