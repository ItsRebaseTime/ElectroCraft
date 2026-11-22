{
  "format": "electrocraft",
  "version": 1,
  "name": "Sample house",
  "author": "",
  "revision": "A",
  "created": "2026-11-21T08:46:45.071Z",
  "modified": "2026-11-21T08:46:45.073Z",
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
      "id": "po3hppb2",
      "name": "Flat board",
      "floor": "Ground floor",
      "room": "Hallway",
      "code": "DB1",
      "rails": [
        {
          "id": "rzv4kbt5",
          "modules": 12
        },
        {
          "id": "r1uv46xm",
          "modules": 12
        },
        {
          "id": "r-bottom",
          "modules": 12
        }
      ],
      "items": [
        {
          "id": "i958k71z",
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
          "id": "ivst7gxb",
          "defId": "isolator",
          "x": 0,
          "y": 0,
          "poleConfig": "1P+N",
          "params": {
            "In": 63,
            "Un": 400
          },
          "on": true,
          "description": "Main switch",
          "manufacturer": "",
          "model": "",
          "railId": "rzv4kbt5",
          "slot": 0
        },
        {
          "id": "ivjykil6",
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
          "railId": "rzv4kbt5",
          "slot": 4
        },
        {
          "id": "im0tvtum",
          "defId": "rcd",
          "x": 0,
          "y": 0,
          "poleConfig": "1P+N",
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
          "railId": "r1uv46xm",
          "slot": 0
        },
        {
          "id": "i79qlcrh",
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
          "id": "i7ljpz5x",
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
          "id": "i6lg94fo",
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
          "id": "ijssxfn5",
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
          "id": "iyib7mmm",
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
          "id": "iiru0ici",
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
          "id": "id19tl41",
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
          "id": "ip8yjzb1",
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
          "id": "ibksp1gn",
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
          "id": "wmeoonx4",
          "from": {
            "item": "i958k71z",
            "terminal": "L1"
          },
          "to": {
            "item": "ivst7gxb",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wiqk4fv4",
          "from": {
            "item": "i958k71z",
            "terminal": "N"
          },
          "to": {
            "item": "ivst7gxb",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wzaodr1t",
          "from": {
            "item": "i958k71z",
            "terminal": "PE"
          },
          "to": {
            "item": "iiru0ici",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wrwu7qnt",
          "from": {
            "item": "ivst7gxb",
            "terminal": "B0"
          },
          "to": {
            "item": "im0tvtum",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wf6ccbw1",
          "from": {
            "item": "ivst7gxb",
            "terminal": "B1"
          },
          "to": {
            "item": "im0tvtum",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w4xbvicx",
          "from": {
            "item": "ivst7gxb",
            "terminal": "B0"
          },
          "to": {
            "item": "ivjykil6",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 6
        },
        {
          "id": "w05o7e1c",
          "from": {
            "item": "ivst7gxb",
            "terminal": "B1"
          },
          "to": {
            "item": "ivjykil6",
            "terminal": "B1"
          },
          "color": "auto",
          "nodes": null,
          "section": 6
        },
        {
          "id": "wlquqku6",
          "from": {
            "item": "im0tvtum",
            "terminal": "B0"
          },
          "to": {
            "item": "i79qlcrh",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w1fboabl",
          "from": {
            "item": "im0tvtum",
            "terminal": "B0"
          },
          "to": {
            "item": "i7ljpz5x",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wbug1xfp",
          "from": {
            "item": "im0tvtum",
            "terminal": "B0"
          },
          "to": {
            "item": "i6lg94fo",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wewve6p8",
          "from": {
            "item": "im0tvtum",
            "terminal": "B0"
          },
          "to": {
            "item": "ijssxfn5",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "whh3sium",
          "from": {
            "item": "im0tvtum",
            "terminal": "B1"
          },
          "to": {
            "item": "iyib7mmm",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wa688ok4",
          "from": {
            "item": "ijssxfn5",
            "terminal": "B0"
          },
          "to": {
            "item": "iyib7mmm",
            "terminal": "B1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wbwne2r1",
          "from": {
            "item": "i79qlcrh",
            "terminal": "B0"
          },
          "to": {
            "item": "id19tl41",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wyjaesof",
          "from": {
            "item": "i7ljpz5x",
            "terminal": "B0"
          },
          "to": {
            "item": "ip8yjzb1",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wz1ey131",
          "from": {
            "item": "i6lg94fo",
            "terminal": "B0"
          },
          "to": {
            "item": "ibksp1gn",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wyllcj6u",
          "from": {
            "item": "iyib7mmm",
            "terminal": "B2"
          },
          "to": {
            "item": "id19tl41",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wap9sp8w",
          "from": {
            "item": "iyib7mmm",
            "terminal": "B3"
          },
          "to": {
            "item": "ip8yjzb1",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w3yzeity",
          "from": {
            "item": "iyib7mmm",
            "terminal": "B4"
          },
          "to": {
            "item": "ibksp1gn",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w57ofmc8",
          "from": {
            "item": "iiru0ici",
            "terminal": "B1"
          },
          "to": {
            "item": "id19tl41",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "welcd4v7",
          "from": {
            "item": "iiru0ici",
            "terminal": "B2"
          },
          "to": {
            "item": "ip8yjzb1",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wgzlfqbq",
          "from": {
            "item": "iiru0ici",
            "terminal": "B3"
          },
          "to": {
            "item": "ibksp1gn",
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
      "id": "pudpkc5k",
      "name": "Workshop board",
      "floor": "First floor",
      "room": "Workshop",
      "code": "DB2",
      "rails": [
        {
          "id": "rebzxn6p",
          "modules": 12
        },
        {
          "id": "rluxggjg",
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
          "id": "ie9odsk7",
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
          "id": "i4ywb571",
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
          "railId": "rebzxn6p",
          "slot": 0
        },
        {
          "id": "i7w9fa85",
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
          "railId": "rluxggjg",
          "slot": 0
        },
        {
          "id": "ilo9in5s",
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
          "id": "iq2no14g",
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
          "id": "iz6gne22",
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
          "id": "ii6w00q4",
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
          "id": "iwe7algk",
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
          "id": "ivzc7n6i",
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
          "id": "ihyybkn5",
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
          "id": "wgneasa6",
          "from": {
            "item": "ie9odsk7",
            "terminal": "L1"
          },
          "to": {
            "item": "i4ywb571",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wc5tv5v2",
          "from": {
            "item": "ie9odsk7",
            "terminal": "L2"
          },
          "to": {
            "item": "i4ywb571",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wjxtygli",
          "from": {
            "item": "ie9odsk7",
            "terminal": "L3"
          },
          "to": {
            "item": "i4ywb571",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w3s3prnf",
          "from": {
            "item": "ie9odsk7",
            "terminal": "N"
          },
          "to": {
            "item": "i4ywb571",
            "terminal": "T3"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wu3rymqq",
          "from": {
            "item": "ie9odsk7",
            "terminal": "PE"
          },
          "to": {
            "item": "iwe7algk",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w5ht0tnd",
          "from": {
            "item": "i4ywb571",
            "terminal": "B0"
          },
          "to": {
            "item": "i7w9fa85",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wx4hx93z",
          "from": {
            "item": "i4ywb571",
            "terminal": "B1"
          },
          "to": {
            "item": "i7w9fa85",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w8284cpp",
          "from": {
            "item": "i4ywb571",
            "terminal": "B2"
          },
          "to": {
            "item": "i7w9fa85",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w0slgld3",
          "from": {
            "item": "i4ywb571",
            "terminal": "B3"
          },
          "to": {
            "item": "i7w9fa85",
            "terminal": "T3"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wj1y7cbe",
          "from": {
            "item": "i7w9fa85",
            "terminal": "B0"
          },
          "to": {
            "item": "ilo9in5s",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wb3471fm",
          "from": {
            "item": "i7w9fa85",
            "terminal": "B1"
          },
          "to": {
            "item": "ilo9in5s",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w2uc9gd8",
          "from": {
            "item": "i7w9fa85",
            "terminal": "B2"
          },
          "to": {
            "item": "ilo9in5s",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w55ckasb",
          "from": {
            "item": "i7w9fa85",
            "terminal": "B0"
          },
          "to": {
            "item": "iz6gne22",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w4wnitwi",
          "from": {
            "item": "i7w9fa85",
            "terminal": "B1"
          },
          "to": {
            "item": "iz6gne22",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wiucw9on",
          "from": {
            "item": "i7w9fa85",
            "terminal": "B2"
          },
          "to": {
            "item": "iz6gne22",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w2ldijs1",
          "from": {
            "item": "i7w9fa85",
            "terminal": "B0"
          },
          "to": {
            "item": "iq2no14g",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wyfwk4eu",
          "from": {
            "item": "i7w9fa85",
            "terminal": "B3"
          },
          "to": {
            "item": "ii6w00q4",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wv82up1p",
          "from": {
            "item": "iz6gne22",
            "terminal": "B0"
          },
          "to": {
            "item": "ii6w00q4",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w86k377u",
          "from": {
            "item": "iz6gne22",
            "terminal": "B1"
          },
          "to": {
            "item": "ii6w00q4",
            "terminal": "B1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wshqsyxp",
          "from": {
            "item": "iz6gne22",
            "terminal": "B2"
          },
          "to": {
            "item": "ii6w00q4",
            "terminal": "B2"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "whrhoqxh",
          "from": {
            "item": "ilo9in5s",
            "terminal": "B0"
          },
          "to": {
            "item": "ivzc7n6i",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wojcmf3f",
          "from": {
            "item": "ilo9in5s",
            "terminal": "B1"
          },
          "to": {
            "item": "ivzc7n6i",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w200kla0",
          "from": {
            "item": "ilo9in5s",
            "terminal": "B2"
          },
          "to": {
            "item": "ivzc7n6i",
            "terminal": "L3"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wnjesmlu",
          "from": {
            "item": "iq2no14g",
            "terminal": "B0"
          },
          "to": {
            "item": "ihyybkn5",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "wa81k1hl",
          "from": {
            "item": "ii6w00q4",
            "terminal": "B3"
          },
          "to": {
            "item": "ihyybkn5",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        },
        {
          "id": "w68g060c",
          "from": {
            "item": "iwe7algk",
            "terminal": "B1"
          },
          "to": {
            "item": "ivzc7n6i",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wslgy4j5",
          "from": {
            "item": "iwe7algk",
            "terminal": "B2"
          },
          "to": {
            "item": "ihyybkn5",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 1.5
        }
      ],
      "notes": ""
    }
  ],
  "modules": [],
  "floorPlans": []
}
