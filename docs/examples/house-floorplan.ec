{
  "format": "electrocraft",
  "version": 1,
  "name": "House with floor plan",
  "author": "ElectroCraft examples",
  "revision": "A",
  "created": "2026-11-20T19:53:06.769Z",
  "modified": "2026-11-20T20:10:08.111Z",
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
      "id": "pmhjjvxp",
      "name": "Main distribution",
      "floor": "Ground floor",
      "room": "Hall",
      "code": "DB1",
      "rails": [
        {
          "id": "a1",
          "modules": 14
        },
        {
          "id": "a2",
          "modules": 14
        },
        {
          "id": "a3",
          "modules": 14
        }
      ],
      "items": [
        {
          "id": "ipom3ib3",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "role": "N",
            "In": 100,
            "count": 12
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
          "id": "ijhmi0kl",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "role": "PE",
            "In": 100,
            "count": 12
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
          "id": "iu9h0il8",
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
          "id": "ifb6a8qi",
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
          "railId": "a1",
          "slot": 0
        },
        {
          "id": "i51cl65a",
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
          "description": "RCD 30 mA",
          "manufacturer": "",
          "model": "",
          "railId": "a2",
          "slot": 0
        },
        {
          "id": "i6397995",
          "defId": "load",
          "x": 60,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 780,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Lighting",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 6 outlets, about 17.9 m, Ground floor",
          "link": {
            "circuit": "cgyj84cj"
          }
        },
        {
          "id": "i0gsnqxg",
          "defId": "load",
          "x": 190,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "generic",
            "phases": 1,
            "P": 750,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Living room sockets",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 4 outlets, about 13.4 m, Ground floor",
          "link": {
            "circuit": "cc6e6wtv"
          }
        },
        {
          "id": "is2cj2ea",
          "defId": "load",
          "x": 320,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 900,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Bedroom sockets",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 4 outlets, about 16.3 m, Ground floor",
          "link": {
            "circuit": "cq6ktibr"
          }
        },
        {
          "id": "i19x39yr",
          "defId": "load",
          "x": 450,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 750,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Office sockets",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 2 outlets, about 9.3 m, Ground floor",
          "link": {
            "circuit": "c8hpyz5b"
          }
        },
        {
          "id": "iijb5a3y",
          "defId": "load",
          "x": 580,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 150,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Bathroom socket",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 1 outlet, about 3.2 m, Ground floor",
          "link": {
            "circuit": "c463nhcx"
          }
        },
        {
          "id": "io46svwd",
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
          "railId": "a3",
          "slot": 0
        },
        {
          "id": "id37dv5t",
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
          "description": "Living room sockets",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 1
        },
        {
          "id": "iz0qn6ev",
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
          "description": "Bedroom sockets",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 2
        },
        {
          "id": "is8p6kmm",
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
          "description": "Office sockets",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 3
        },
        {
          "id": "ilv5n60t",
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
          "description": "Bathroom socket",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 4
        }
      ],
      "wires": [
        {
          "id": "w174tedr",
          "from": {
            "item": "iu9h0il8",
            "terminal": "L1"
          },
          "to": {
            "item": "ifb6a8qi",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wyixeo0j",
          "from": {
            "item": "iu9h0il8",
            "terminal": "N"
          },
          "to": {
            "item": "ifb6a8qi",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wob2jd5d",
          "from": {
            "item": "iu9h0il8",
            "terminal": "PE"
          },
          "to": {
            "item": "ijhmi0kl",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w7zrycl5",
          "from": {
            "item": "ifb6a8qi",
            "terminal": "B0"
          },
          "to": {
            "item": "i51cl65a",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wifd01qd",
          "from": {
            "item": "ifb6a8qi",
            "terminal": "B1"
          },
          "to": {
            "item": "i51cl65a",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w3l1q1o9",
          "from": {
            "item": "i51cl65a",
            "terminal": "B1"
          },
          "to": {
            "item": "ipom3ib3",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w2utymn7",
          "from": {
            "item": "i51cl65a",
            "terminal": "B0"
          },
          "to": {
            "item": "io46svwd",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w3h0z7u8",
          "from": {
            "item": "io46svwd",
            "terminal": "B0"
          },
          "to": {
            "item": "i6397995",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wulvkx1u",
          "from": {
            "item": "ipom3ib3",
            "terminal": "B1"
          },
          "to": {
            "item": "i6397995",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wrkfw9jb",
          "from": {
            "item": "ijhmi0kl",
            "terminal": "B1"
          },
          "to": {
            "item": "i6397995",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wzvqs5hf",
          "from": {
            "item": "i51cl65a",
            "terminal": "B0"
          },
          "to": {
            "item": "id37dv5t",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wdg1es8d",
          "from": {
            "item": "id37dv5t",
            "terminal": "B0"
          },
          "to": {
            "item": "i0gsnqxg",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wnfy79r2",
          "from": {
            "item": "ipom3ib3",
            "terminal": "B2"
          },
          "to": {
            "item": "i0gsnqxg",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w5m0vkvo",
          "from": {
            "item": "ijhmi0kl",
            "terminal": "B2"
          },
          "to": {
            "item": "i0gsnqxg",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w5igcuu9",
          "from": {
            "item": "i51cl65a",
            "terminal": "B0"
          },
          "to": {
            "item": "iz0qn6ev",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w3l9cx74",
          "from": {
            "item": "iz0qn6ev",
            "terminal": "B0"
          },
          "to": {
            "item": "is2cj2ea",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wwinfd2w",
          "from": {
            "item": "ipom3ib3",
            "terminal": "B3"
          },
          "to": {
            "item": "is2cj2ea",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w9kj3vn0",
          "from": {
            "item": "ijhmi0kl",
            "terminal": "B3"
          },
          "to": {
            "item": "is2cj2ea",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wae7dcfu",
          "from": {
            "item": "i51cl65a",
            "terminal": "B0"
          },
          "to": {
            "item": "is8p6kmm",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wgaxbcj5",
          "from": {
            "item": "is8p6kmm",
            "terminal": "B0"
          },
          "to": {
            "item": "i19x39yr",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wsf04h7t",
          "from": {
            "item": "ipom3ib3",
            "terminal": "B4"
          },
          "to": {
            "item": "i19x39yr",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w2b7otgk",
          "from": {
            "item": "ijhmi0kl",
            "terminal": "B4"
          },
          "to": {
            "item": "i19x39yr",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w6nmcjdu",
          "from": {
            "item": "i51cl65a",
            "terminal": "B0"
          },
          "to": {
            "item": "ilv5n60t",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wj9qwnhm",
          "from": {
            "item": "ilv5n60t",
            "terminal": "B0"
          },
          "to": {
            "item": "iijb5a3y",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wh6zdr61",
          "from": {
            "item": "ipom3ib3",
            "terminal": "B5"
          },
          "to": {
            "item": "iijb5a3y",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w7lpwmo2",
          "from": {
            "item": "ijhmi0kl",
            "terminal": "B5"
          },
          "to": {
            "item": "iijb5a3y",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        }
      ],
      "notes": "",
      "region": "eu",
      "usPhases": 2
    },
    {
      "id": "p4g9o3lv",
      "name": "Kitchen sub-board",
      "floor": "Ground floor",
      "room": "Kitchen",
      "code": "DB2",
      "rails": [
        {
          "id": "b1",
          "modules": 14
        },
        {
          "id": "b2",
          "modules": 14
        },
        {
          "id": "b3",
          "modules": 14
        }
      ],
      "items": [
        {
          "id": "ivgnlyvk",
          "defId": "load",
          "x": 60,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 900,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Kitchen sockets",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 3 outlets, about 7.0 m, Ground floor",
          "link": {
            "circuit": "c9w06oe3"
          }
        },
        {
          "id": "ib6lzx1a",
          "defId": "load",
          "x": 190,
          "y": 590,
          "poleConfig": "1P",
          "params": {
            "kind": "heater",
            "phases": 1,
            "P": 3000,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Oven",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 1 outlet, about 3.0 m, Ground floor",
          "link": {
            "circuit": "cpj85okn"
          }
        },
        {
          "id": "in7t4qab",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "role": "N",
            "In": 100,
            "count": 12
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
          "id": "ideukl0j",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "role": "PE",
            "In": 100,
            "count": 12
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
          "id": "in5vw2wh",
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
          "description": "Feeder from DB1",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "i0j750n1",
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
          "railId": "b1",
          "slot": 0
        },
        {
          "id": "ius08iy8",
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
          "description": "RCD 30 mA",
          "manufacturer": "",
          "model": "",
          "railId": "b2",
          "slot": 0
        },
        {
          "id": "ilwbtik7",
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
          "description": "Kitchen sockets",
          "manufacturer": "",
          "model": "",
          "railId": "b3",
          "slot": 0
        },
        {
          "id": "i70ha157",
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
          "railId": "b3",
          "slot": 1
        }
      ],
      "wires": [
        {
          "id": "wb1guvtr",
          "from": {
            "item": "in5vw2wh",
            "terminal": "L1"
          },
          "to": {
            "item": "i0j750n1",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wd7g0wju",
          "from": {
            "item": "in5vw2wh",
            "terminal": "N"
          },
          "to": {
            "item": "i0j750n1",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wj71vf8o",
          "from": {
            "item": "in5vw2wh",
            "terminal": "PE"
          },
          "to": {
            "item": "ideukl0j",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wxgod5nb",
          "from": {
            "item": "i0j750n1",
            "terminal": "B0"
          },
          "to": {
            "item": "ius08iy8",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wwkafvd5",
          "from": {
            "item": "i0j750n1",
            "terminal": "B1"
          },
          "to": {
            "item": "ius08iy8",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "whctsu8a",
          "from": {
            "item": "ius08iy8",
            "terminal": "B1"
          },
          "to": {
            "item": "in7t4qab",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wldnmqg7",
          "from": {
            "item": "ius08iy8",
            "terminal": "B0"
          },
          "to": {
            "item": "ilwbtik7",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wxg2opb9",
          "from": {
            "item": "ilwbtik7",
            "terminal": "B0"
          },
          "to": {
            "item": "ivgnlyvk",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w8z5clwy",
          "from": {
            "item": "in7t4qab",
            "terminal": "B1"
          },
          "to": {
            "item": "ivgnlyvk",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wkkgl4uo",
          "from": {
            "item": "ideukl0j",
            "terminal": "B1"
          },
          "to": {
            "item": "ivgnlyvk",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wohjyuyx",
          "from": {
            "item": "ius08iy8",
            "terminal": "B0"
          },
          "to": {
            "item": "i70ha157",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w52cc2uw",
          "from": {
            "item": "i70ha157",
            "terminal": "B0"
          },
          "to": {
            "item": "ib6lzx1a",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wc843nfy",
          "from": {
            "item": "in7t4qab",
            "terminal": "B2"
          },
          "to": {
            "item": "ib6lzx1a",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wtjqrfit",
          "from": {
            "item": "ideukl0j",
            "terminal": "B2"
          },
          "to": {
            "item": "ib6lzx1a",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        }
      ],
      "notes": "",
      "region": "eu",
      "usPhases": 2
    },
    {
      "id": "pucbimhi",
      "name": "Media cabinet",
      "floor": "Ground floor",
      "room": "Home office",
      "code": "MC",
      "rails": [
        {
          "id": "m1",
          "modules": 14
        }
      ],
      "items": [
        {
          "id": "ihkknnxp",
          "defId": "floor_port",
          "x": 60,
          "y": 316,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "pqtyejjv",
            "port": 0
          }
        },
        {
          "id": "iocirc3d",
          "defId": "floor_port",
          "x": 190,
          "y": 316,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: AP1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "pha9geqi",
            "port": 0
          }
        },
        {
          "id": "iiqfqxal",
          "defId": "floor_port",
          "x": 320,
          "y": 316,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ2.1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 1 of 2, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "pkenxwv0",
            "port": 0
          }
        },
        {
          "id": "i877384z",
          "defId": "floor_port",
          "x": 450,
          "y": 316,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ2.2",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 2 of 2, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "pkenxwv0",
            "port": 1
          }
        },
        {
          "id": "ioimukr0",
          "defId": "floor_port",
          "x": 580,
          "y": 316,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ3.1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 1 of 4, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "ph0j2mnl",
            "port": 0
          }
        },
        {
          "id": "iumvb531",
          "defId": "floor_port",
          "x": 710,
          "y": 316,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ3.2",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 2 of 4, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "ph0j2mnl",
            "port": 1
          }
        },
        {
          "id": "ii8bag02",
          "defId": "floor_port",
          "x": 840,
          "y": 316,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ3.3",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 3 of 4, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "ph0j2mnl",
            "port": 2
          }
        },
        {
          "id": "iofa3v59",
          "defId": "floor_port",
          "x": 970,
          "y": 316,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ3.4",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 4 of 4, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "ph0j2mnl",
            "port": 3
          }
        },
        {
          "id": "i0vuiiqd",
          "defId": "floor_port",
          "x": 60,
          "y": 446,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ4.1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 1 of 2, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "pivkumuv",
            "port": 0
          }
        },
        {
          "id": "ij431r4b",
          "defId": "floor_port",
          "x": 190,
          "y": 446,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ4.2",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 2 of 2, Ground floor",
          "link": {
            "circuit": "crip5of6",
            "point": "pivkumuv",
            "port": 1
          }
        },
        {
          "id": "ifefglqf",
          "defId": "floor_port",
          "x": 320,
          "y": 446,
          "poleConfig": "1P",
          "params": {
            "medium": "coax"
          },
          "on": true,
          "description": "TV: TV1",
          "manufacturer": "",
          "model": "",
          "note": "RG6, Ground floor",
          "link": {
            "circuit": "cssoxn5y",
            "point": "p0z9y78d",
            "port": 0
          }
        },
        {
          "id": "ichsmd3m",
          "defId": "floor_port",
          "x": 450,
          "y": 446,
          "poleConfig": "1P",
          "params": {
            "medium": "coax"
          },
          "on": true,
          "description": "TV: TV2.1",
          "manufacturer": "",
          "model": "",
          "note": "RG6, port 1 of 2, Ground floor",
          "link": {
            "circuit": "cssoxn5y",
            "point": "pwqfh0nh",
            "port": 0
          }
        },
        {
          "id": "i8o4nt9f",
          "defId": "floor_port",
          "x": 580,
          "y": 446,
          "poleConfig": "1P",
          "params": {
            "medium": "coax"
          },
          "on": true,
          "description": "TV: TV2.2",
          "manufacturer": "",
          "model": "",
          "note": "RG6, port 2 of 2, Ground floor",
          "link": {
            "circuit": "cssoxn5y",
            "point": "pwqfh0nh",
            "port": 1
          }
        },
        {
          "id": "ii6axl48",
          "defId": "floor_port",
          "x": 710,
          "y": 446,
          "poleConfig": "1P",
          "params": {
            "medium": "fiber"
          },
          "on": true,
          "description": "Fibre: FO1.1",
          "manufacturer": "",
          "model": "",
          "note": "OS2 single-mode, port 1 of 2, Ground floor",
          "link": {
            "circuit": "c2ks1lgr",
            "point": "p88fbftc",
            "port": 0
          }
        },
        {
          "id": "isfz3ofo",
          "defId": "floor_port",
          "x": 840,
          "y": 446,
          "poleConfig": "1P",
          "params": {
            "medium": "fiber"
          },
          "on": true,
          "description": "Fibre: FO1.2",
          "manufacturer": "",
          "model": "",
          "note": "OS2 single-mode, port 2 of 2, Ground floor",
          "link": {
            "circuit": "c2ks1lgr",
            "point": "p88fbftc",
            "port": 1
          }
        },
        {
          "id": "igfophii",
          "defId": "keystone",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "rows": 2,
            "cols": 12
          },
          "on": true,
          "description": "Patch panel",
          "manufacturer": "",
          "model": "",
          "bar": {
            "section": "main",
            "edge": "bottom"
          }
        }
      ],
      "wires": [
        {
          "id": "w9egkv1t",
          "from": {
            "item": "ii6axl48",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_0"
          },
          "color": "orange",
          "nodes": null,
          "section": 0.5,
          "label": "FO1.1"
        },
        {
          "id": "wdiig1de",
          "from": {
            "item": "isfz3ofo",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_1"
          },
          "color": "orange",
          "nodes": null,
          "section": 0.5,
          "label": "FO1.2"
        },
        {
          "id": "wvktu2yv",
          "from": {
            "item": "iocirc3d",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_2"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "AP1"
        },
        {
          "id": "wi0a67nq",
          "from": {
            "item": "ihkknnxp",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_3"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ1"
        },
        {
          "id": "w0ta1puv",
          "from": {
            "item": "iiqfqxal",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_4"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ2.1"
        },
        {
          "id": "w3s9w9tj",
          "from": {
            "item": "i877384z",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_5"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ2.2"
        },
        {
          "id": "wvrmwxs2",
          "from": {
            "item": "ioimukr0",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_6"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ3.1"
        },
        {
          "id": "wjtowkl9",
          "from": {
            "item": "iumvb531",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_7"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ3.2"
        },
        {
          "id": "w9brrh4f",
          "from": {
            "item": "ii8bag02",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_8"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ3.3"
        },
        {
          "id": "wcat7554",
          "from": {
            "item": "iofa3v59",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_9"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ3.4"
        },
        {
          "id": "ws32cfqx",
          "from": {
            "item": "i0vuiiqd",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_10"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ4.1"
        },
        {
          "id": "wlmbv331",
          "from": {
            "item": "ij431r4b",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P0_11"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ4.2"
        },
        {
          "id": "wu17lftm",
          "from": {
            "item": "ifefglqf",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P1_0"
          },
          "color": "violet",
          "nodes": null,
          "section": 0.5,
          "label": "TV1"
        },
        {
          "id": "wbc6y329",
          "from": {
            "item": "ichsmd3m",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P1_1"
          },
          "color": "violet",
          "nodes": null,
          "section": 0.5,
          "label": "TV2.1"
        },
        {
          "id": "wakcrxrw",
          "from": {
            "item": "i8o4nt9f",
            "terminal": "port"
          },
          "to": {
            "item": "igfophii",
            "terminal": "P1_2"
          },
          "color": "violet",
          "nodes": null,
          "section": 0.5,
          "label": "TV2.2"
        }
      ],
      "notes": "",
      "region": "eu",
      "usPhases": 2
    }
  ],
  "modules": [],
  "floorPlans": [
    {
      "id": "fk9xe9hp",
      "name": "Ground floor",
      "layers": [
        {
          "id": "floor",
          "name": "Floor"
        },
        {
          "id": "walls",
          "name": "Walls"
        },
        {
          "id": "ceiling",
          "name": "Ceiling"
        }
      ],
      "w": 1400,
      "h": 900,
      "pxPerM": 100,
      "points": [
        {
          "id": "pu26f0nu",
          "kind": "light",
          "x": 300,
          "y": 200,
          "label": "L1",
          "count": 3,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "p6hgw2yl",
          "kind": "light",
          "x": 730,
          "y": 200,
          "label": "L2",
          "count": 4,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "pyj9pngt",
          "kind": "light",
          "x": 1105,
          "y": 200,
          "label": "L3",
          "count": 2,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "pczureep",
          "kind": "light",
          "x": 1105,
          "y": 640,
          "label": "L4",
          "count": 2,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "pmb8u4s6",
          "kind": "light",
          "x": 850,
          "y": 640,
          "label": "L5",
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "piqe7x52",
          "kind": "light",
          "x": 620,
          "y": 640,
          "label": "L6",
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "p1zu7trr",
          "kind": "socket",
          "x": 90,
          "y": 300,
          "label": "S1",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "p7mf479w",
          "kind": "socket",
          "x": 300,
          "y": 100,
          "label": "S2",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "p1tx2xl1",
          "kind": "socket",
          "x": 485,
          "y": 300,
          "label": "S3",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "ppdu7fw6",
          "kind": "socket",
          "x": 620,
          "y": 150,
          "label": "S4",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pifehhor",
          "kind": "socket",
          "x": 720,
          "y": 100,
          "label": "S5",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pazvacnz",
          "kind": "socket",
          "x": 815,
          "y": 150,
          "label": "S6",
          "count": 3,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pztl2fek",
          "kind": "appliance",
          "x": 850,
          "y": 380,
          "label": "A1",
          "watts": 1000,
          "layer": "floor"
        },
        {
          "id": "p57s7dxn",
          "kind": "socket",
          "x": 950,
          "y": 100,
          "label": "S7",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pskj5x43",
          "kind": "socket",
          "x": 1300,
          "y": 250,
          "label": "S8",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "ps11f2bd",
          "kind": "socket",
          "x": 1300,
          "y": 520,
          "label": "S9",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "p6eqg7f9",
          "kind": "socket",
          "x": 1050,
          "y": 520,
          "label": "S10",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pvdkk8nz",
          "kind": "socket",
          "x": 90,
          "y": 500,
          "label": "S11",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pknnmpjq",
          "kind": "socket",
          "x": 250,
          "y": 800,
          "label": "S12",
          "count": 4,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "p8886six",
          "kind": "socket",
          "x": 760,
          "y": 520,
          "label": "S13",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pqtyejjv",
          "kind": "network",
          "x": 110,
          "y": 400,
          "label": "RJ1",
          "layer": "walls"
        },
        {
          "id": "pha9geqi",
          "kind": "wifi",
          "x": 260,
          "y": 520,
          "label": "AP1",
          "layer": "ceiling"
        },
        {
          "id": "pkenxwv0",
          "kind": "network",
          "x": 380,
          "y": 500,
          "label": "RJ2",
          "count": 2,
          "layer": "walls"
        },
        {
          "id": "ph0j2mnl",
          "kind": "network",
          "x": 200,
          "y": 700,
          "label": "RJ3",
          "count": 4,
          "layer": "walls"
        },
        {
          "id": "pivkumuv",
          "kind": "network",
          "x": 1300,
          "y": 800,
          "label": "RJ4",
          "count": 2,
          "layer": "walls"
        },
        {
          "id": "p0z9y78d",
          "kind": "tv",
          "x": 250,
          "y": 380,
          "label": "TV1",
          "layer": "walls"
        },
        {
          "id": "pwqfh0nh",
          "kind": "tv",
          "x": 1300,
          "y": 100,
          "label": "TV2",
          "count": 2,
          "layer": "walls"
        },
        {
          "id": "p88fbftc",
          "kind": "fiber",
          "x": 180,
          "y": 830,
          "label": "FO1",
          "count": 2,
          "layer": "walls"
        },
        {
          "id": "p2icnb9j",
          "kind": "amp",
          "x": 420,
          "y": 380,
          "label": "AMP1",
          "layer": "floor",
          "watts": 150,
          "channels": 5
        },
        {
          "id": "p416shho",
          "kind": "speaker",
          "x": 100,
          "y": 130,
          "label": "SP1",
          "layer": "walls",
          "count": 2
        },
        {
          "id": "ph67r6ao",
          "kind": "speaker",
          "x": 520,
          "y": 130,
          "label": "SP2",
          "layer": "walls",
          "count": 2
        }
      ],
      "panels": [
        {
          "id": "mvwzfo6o",
          "panelId": "pmhjjvxp",
          "x": 560,
          "y": 640
        },
        {
          "id": "mu0yar7b",
          "panelId": "p4g9o3lv",
          "x": 640,
          "y": 385
        },
        {
          "id": "mu3yu8qh",
          "panelId": "pucbimhi",
          "x": 90,
          "y": 820
        }
      ],
      "circuits": [
        {
          "id": "cgyj84cj",
          "name": "Lighting",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pu26f0nu"
            },
            {
              "point": "p6hgw2yl"
            },
            {
              "point": "pyj9pngt"
            },
            {
              "point": "pczureep"
            },
            {
              "point": "pmb8u4s6"
            },
            {
              "point": "piqe7x52"
            }
          ],
          "layer": "ceiling",
          "panel": "mvwzfo6o"
        },
        {
          "id": "cc6e6wtv",
          "name": "Living room sockets",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "p1zu7trr"
            },
            {
              "point": "p7mf479w"
            },
            {
              "point": "p1tx2xl1"
            },
            {
              "point": "p2icnb9j"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 485,
              "y": 640
            }
          ],
          "panel": "mvwzfo6o"
        },
        {
          "id": "c9w06oe3",
          "name": "Kitchen sockets",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "ppdu7fw6"
            },
            {
              "point": "pifehhor"
            },
            {
              "point": "pazvacnz"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 815,
              "y": 300
            }
          ],
          "panel": "mu0yar7b"
        },
        {
          "id": "cpj85okn",
          "name": "Oven",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pztl2fek"
            }
          ],
          "layer": "floor",
          "run": [
            {
              "x": 830,
              "y": 340
            }
          ],
          "panel": "mu0yar7b",
          "watts": 3000
        },
        {
          "id": "cq6ktibr",
          "name": "Bedroom sockets",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "p57s7dxn"
            },
            {
              "point": "pskj5x43"
            },
            {
              "point": "ps11f2bd"
            },
            {
              "point": "p6eqg7f9"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 600,
              "y": 520
            }
          ],
          "panel": "mvwzfo6o"
        },
        {
          "id": "c8hpyz5b",
          "name": "Office sockets",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pvdkk8nz"
            },
            {
              "point": "pknnmpjq"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 440,
              "y": 800
            }
          ],
          "panel": "mvwzfo6o"
        },
        {
          "id": "c463nhcx",
          "name": "Bathroom socket",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "p8886six"
            }
          ],
          "layer": "walls",
          "panel": "mvwzfo6o"
        },
        {
          "id": "crip5of6",
          "name": "Network",
          "medium": "network",
          "topology": "star",
          "cable": "Cat6",
          "color": "#2563eb",
          "nodes": [
            {
              "point": "pqtyejjv"
            },
            {
              "point": "pha9geqi"
            },
            {
              "point": "pkenxwv0"
            },
            {
              "point": "ph0j2mnl"
            },
            {
              "point": "pivkumuv"
            }
          ],
          "layer": "walls",
          "panel": "mu3yu8qh"
        },
        {
          "id": "cssoxn5y",
          "name": "TV",
          "medium": "coax",
          "topology": "star",
          "cable": "RG6",
          "color": "#9333ea",
          "nodes": [
            {
              "point": "p0z9y78d"
            },
            {
              "point": "pwqfh0nh"
            }
          ],
          "layer": "walls",
          "panel": "mu3yu8qh"
        },
        {
          "id": "c2ks1lgr",
          "name": "Fibre",
          "medium": "fiber",
          "topology": "star",
          "cable": "OS2 single-mode",
          "color": "#0f9d58",
          "nodes": [
            {
              "point": "p88fbftc"
            }
          ],
          "layer": "walls",
          "panel": "mu3yu8qh"
        },
        {
          "id": "cgqjxqvq",
          "name": "Living room speakers",
          "medium": "audio",
          "topology": "star",
          "cable": "2x1.5 mm² speaker cable",
          "color": "#0d9488",
          "nodes": [
            {
              "point": "p416shho"
            },
            {
              "point": "ph67r6ao"
            }
          ],
          "layer": "walls",
          "hub": "p2icnb9j"
        }
      ],
      "image": {
        "data": "data:image/png;base64,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",
        "w": 1400,
        "h": 900
      }
    }
  ]
}