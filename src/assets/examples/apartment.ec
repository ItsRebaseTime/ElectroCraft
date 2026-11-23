{
  "format": "electrocraft",
  "version": 1,
  "name": "Apartment",
  "author": "ElectroCraft examples",
  "revision": "A",
  "created": "2026-11-20T20:44:49.427Z",
  "modified": "2026-11-23T20:59:08.997Z",
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
      "id": "pbk6qb0m",
      "name": "Apartment board",
      "floor": "3rd floor",
      "room": "Hall",
      "code": "DB1",
      "rails": [
        {
          "id": "a1",
          "modules": 16
        },
        {
          "id": "a2",
          "modules": 16
        },
        {
          "id": "a3",
          "modules": 16
        }
      ],
      "items": [
        {
          "id": "iyt6i52f",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "role": "N",
            "In": 100,
            "count": 16
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
          "id": "ip7968kw",
          "defId": "bus",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "role": "PE",
            "In": 100,
            "count": 16
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
          "id": "ireum3m5",
          "defId": "supply",
          "x": 60,
          "y": -300,
          "poleConfig": "1P",
          "params": {
            "phases": 3,
            "In": 40,
            "Un": 230,
            "feeder": "5x10 mm²"
          },
          "on": true,
          "description": "Incoming supply 3 x 230/400 V",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "iqtdshmi",
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
          "railId": "a1",
          "slot": 0
        },
        {
          "id": "iz8hwlim",
          "defId": "rcd",
          "x": 0,
          "y": 0,
          "poleConfig": "4P",
          "params": {
            "In": 63,
            "IdN": 30,
            "type": "A",
            "Un": 400
          },
          "on": true,
          "description": "RCD 30 mA",
          "manufacturer": "",
          "model": "",
          "railId": "a2",
          "slot": 0
        },
        {
          "id": "ir07rtgz",
          "defId": "load",
          "x": 25,
          "y": 650,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 480,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Lighting hall",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 4 outlets, about 10.3 m, 3rd floor",
          "link": {
            "circuit": "ca4taw4q"
          }
        },
        {
          "id": "i701e4lc",
          "defId": "load",
          "x": 181,
          "y": 650,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 300,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Lighting living room",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 2 outlets, about 14.8 m, 3rd floor",
          "link": {
            "circuit": "cqpsffv0"
          }
        },
        {
          "id": "in23a78d",
          "defId": "load",
          "x": 25,
          "y": 794,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 240,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Lighting bedrooms and bath",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 3 outlets, about 13.5 m, 3rd floor",
          "link": {
            "circuit": "ctsecgth"
          }
        },
        {
          "id": "iy1rjmvy",
          "defId": "load",
          "x": 181,
          "y": 794,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 360,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Lighting kitchen and utility",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 2 outlets, about 11.1 m, 3rd floor",
          "link": {
            "circuit": "culik9ep"
          }
        },
        {
          "id": "imqna7gz",
          "defId": "load",
          "x": 25,
          "y": 938,
          "poleConfig": "1P",
          "params": {
            "kind": "generic",
            "phases": 1,
            "P": 1200,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Sockets living room",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 5 outlets, about 26.9 m, 3rd floor",
          "link": {
            "circuit": "cvx3c65i"
          }
        },
        {
          "id": "iqc2fr26",
          "defId": "load",
          "x": 181,
          "y": 938,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 1200,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Sockets bedroom and office",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 4 outlets, about 22.8 m, 3rd floor",
          "link": {
            "circuit": "c7wthf87"
          }
        },
        {
          "id": "iz410zoy",
          "defId": "load",
          "x": 25,
          "y": 1082,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 1050,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Sockets kitchen",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 4 outlets, about 10.4 m, 3rd floor",
          "link": {
            "circuit": "c7dlt998"
          }
        },
        {
          "id": "ijwi2gz3",
          "defId": "load",
          "x": 181,
          "y": 1082,
          "poleConfig": "1P",
          "params": {
            "kind": "heater",
            "phases": 2,
            "P": 5000,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Hob (2 phases)",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 1 outlet, about 6.8 m, 3rd floor",
          "link": {
            "circuit": "cfnz3390"
          }
        },
        {
          "id": "iuyfd3gh",
          "defId": "load",
          "x": 25,
          "y": 1226,
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
          "note": "3x1.5 mm², 1 outlet, about 6.2 m, 3rd floor",
          "link": {
            "circuit": "crgrpp9y"
          }
        },
        {
          "id": "ioyqeofc",
          "defId": "load",
          "x": 181,
          "y": 1226,
          "poleConfig": "1P",
          "params": {
            "kind": "heater",
            "phases": 1,
            "P": 2000,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Dishwasher",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 1 outlet, about 5.3 m, 3rd floor",
          "link": {
            "circuit": "cdndj005"
          }
        },
        {
          "id": "inzaf1zx",
          "defId": "load",
          "x": 25,
          "y": 1370,
          "poleConfig": "1P",
          "params": {
            "kind": "heater",
            "phases": 1,
            "P": 2300,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Washing machine",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 1 outlet, about 5.5 m, 3rd floor",
          "link": {
            "circuit": "c3tk630d"
          }
        },
        {
          "id": "iq3zcg85",
          "defId": "load",
          "x": 181,
          "y": 1370,
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
          "note": "3x1.5 mm², 1 outlet, about 6.8 m, 3rd floor",
          "link": {
            "circuit": "c02crykq"
          }
        },
        {
          "id": "is5x8iyh",
          "defId": "load",
          "x": 25,
          "y": 1514,
          "poleConfig": "1P",
          "params": {
            "kind": "heater",
            "phases": 1,
            "P": 2000,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Water heater",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 1 outlet, about 4.8 m, 3rd floor",
          "link": {
            "circuit": "cqmnavq3"
          }
        },
        {
          "id": "i8fhbdw8",
          "defId": "load",
          "x": 181,
          "y": 1514,
          "poleConfig": "1P",
          "params": {
            "kind": "socket",
            "phases": 1,
            "P": 300,
            "cosphi": 1,
            "U": 0
          },
          "on": true,
          "description": "Utility sockets",
          "manufacturer": "",
          "model": "",
          "note": "3x1.5 mm², 1 outlet, about 5.6 m, 3rd floor",
          "link": {
            "circuit": "cpnl6p4o"
          }
        },
        {
          "id": "ijhl8w3d",
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
          "description": "Lighting hall",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 0
        },
        {
          "id": "izep0lvl",
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
          "description": "Lighting living room",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 1
        },
        {
          "id": "imfuavgt",
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
          "description": "Lighting bedrooms and bath",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 2
        },
        {
          "id": "igv5ubkc",
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
          "description": "Lighting kitchen and utility",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 3
        },
        {
          "id": "ic72o8yl",
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
          "description": "Sockets living room",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 4
        },
        {
          "id": "iacthvg2",
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
          "description": "Sockets bedroom and office",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 5
        },
        {
          "id": "i1pzd934",
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
          "description": "Sockets kitchen",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 6
        },
        {
          "id": "idnee694",
          "defId": "mcb",
          "x": 0,
          "y": 0,
          "poleConfig": "2P",
          "params": {
            "In": 16,
            "curve": "B",
            "Icn": 6000,
            "Un": 230
          },
          "on": true,
          "description": "Hob (2 phases)",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 7
        },
        {
          "id": "i7gj41i7",
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
          "railId": "a3",
          "slot": 9
        },
        {
          "id": "ixf44myx",
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
          "description": "Dishwasher",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 10
        },
        {
          "id": "iztoiith",
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
          "description": "Washing machine",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 11
        },
        {
          "id": "ititqz1t",
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
          "slot": 12
        },
        {
          "id": "ife145l7",
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
          "description": "Water heater",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 13
        },
        {
          "id": "iagd03gv",
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
          "description": "Utility sockets",
          "manufacturer": "",
          "model": "",
          "railId": "a3",
          "slot": 14
        }
      ],
      "wires": [
        {
          "id": "wej5cacs",
          "from": {
            "item": "ireum3m5",
            "terminal": "L1"
          },
          "to": {
            "item": "iqtdshmi",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wemjjq5h",
          "from": {
            "item": "ireum3m5",
            "terminal": "L2"
          },
          "to": {
            "item": "iqtdshmi",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wtzp4s8k",
          "from": {
            "item": "ireum3m5",
            "terminal": "L3"
          },
          "to": {
            "item": "iqtdshmi",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w2lcz6sy",
          "from": {
            "item": "ireum3m5",
            "terminal": "N"
          },
          "to": {
            "item": "iqtdshmi",
            "terminal": "T3"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wxmn6a7t",
          "from": {
            "item": "ireum3m5",
            "terminal": "PE"
          },
          "to": {
            "item": "ip7968kw",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wnvf9v05",
          "from": {
            "item": "iqtdshmi",
            "terminal": "B0"
          },
          "to": {
            "item": "iz8hwlim",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w502in8g",
          "from": {
            "item": "iqtdshmi",
            "terminal": "B1"
          },
          "to": {
            "item": "iz8hwlim",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wkecjjqh",
          "from": {
            "item": "iqtdshmi",
            "terminal": "B2"
          },
          "to": {
            "item": "iz8hwlim",
            "terminal": "T2"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w3rtul42",
          "from": {
            "item": "iqtdshmi",
            "terminal": "B3"
          },
          "to": {
            "item": "iz8hwlim",
            "terminal": "T3"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "wh6retnr",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B3"
          },
          "to": {
            "item": "iyt6i52f",
            "terminal": "B0"
          },
          "color": "auto",
          "nodes": null,
          "section": 10
        },
        {
          "id": "w5gqoy5d",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B0"
          },
          "to": {
            "item": "ijhl8w3d",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wylc80e2",
          "from": {
            "item": "ijhl8w3d",
            "terminal": "B0"
          },
          "to": {
            "item": "ir07rtgz",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wi08glsi",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B1"
          },
          "to": {
            "item": "ir07rtgz",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wqf7aym1",
          "from": {
            "item": "ip7968kw",
            "terminal": "B1"
          },
          "to": {
            "item": "ir07rtgz",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wl3dwxyj",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B1"
          },
          "to": {
            "item": "izep0lvl",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w7mzkmo5",
          "from": {
            "item": "izep0lvl",
            "terminal": "B0"
          },
          "to": {
            "item": "i701e4lc",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wxgidtt7",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B2"
          },
          "to": {
            "item": "i701e4lc",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "weewzg73",
          "from": {
            "item": "ip7968kw",
            "terminal": "B2"
          },
          "to": {
            "item": "i701e4lc",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wut3q4ui",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B2"
          },
          "to": {
            "item": "imfuavgt",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w3pnd4yb",
          "from": {
            "item": "imfuavgt",
            "terminal": "B0"
          },
          "to": {
            "item": "in23a78d",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wx58wudt",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B3"
          },
          "to": {
            "item": "in23a78d",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wg3qyieq",
          "from": {
            "item": "ip7968kw",
            "terminal": "B3"
          },
          "to": {
            "item": "in23a78d",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wwjw2mmh",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B0"
          },
          "to": {
            "item": "igv5ubkc",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w98eojzo",
          "from": {
            "item": "igv5ubkc",
            "terminal": "B0"
          },
          "to": {
            "item": "iy1rjmvy",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w35ypbxf",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B4"
          },
          "to": {
            "item": "iy1rjmvy",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wpy6fqk2",
          "from": {
            "item": "ip7968kw",
            "terminal": "B4"
          },
          "to": {
            "item": "iy1rjmvy",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wrwltucm",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B1"
          },
          "to": {
            "item": "ic72o8yl",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w809gpwq",
          "from": {
            "item": "ic72o8yl",
            "terminal": "B0"
          },
          "to": {
            "item": "imqna7gz",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "woxkduie",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B5"
          },
          "to": {
            "item": "imqna7gz",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wnywmd7y",
          "from": {
            "item": "ip7968kw",
            "terminal": "B5"
          },
          "to": {
            "item": "imqna7gz",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w7690t38",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B2"
          },
          "to": {
            "item": "iacthvg2",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wq4s9sb4",
          "from": {
            "item": "iacthvg2",
            "terminal": "B0"
          },
          "to": {
            "item": "iqc2fr26",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w008emu9",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B6"
          },
          "to": {
            "item": "iqc2fr26",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wp6m3c5x",
          "from": {
            "item": "ip7968kw",
            "terminal": "B6"
          },
          "to": {
            "item": "iqc2fr26",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w88y2a0z",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B0"
          },
          "to": {
            "item": "i1pzd934",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wm21oijz",
          "from": {
            "item": "i1pzd934",
            "terminal": "B0"
          },
          "to": {
            "item": "iz410zoy",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wqc7tb3w",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B7"
          },
          "to": {
            "item": "iz410zoy",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wghbuwls",
          "from": {
            "item": "ip7968kw",
            "terminal": "B7"
          },
          "to": {
            "item": "iz410zoy",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wteni1ie",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B0"
          },
          "to": {
            "item": "idnee694",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wvjm1n5a",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B1"
          },
          "to": {
            "item": "idnee694",
            "terminal": "T1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wf3colx0",
          "from": {
            "item": "idnee694",
            "terminal": "B0"
          },
          "to": {
            "item": "ijwi2gz3",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wei4j863",
          "from": {
            "item": "idnee694",
            "terminal": "B1"
          },
          "to": {
            "item": "ijwi2gz3",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w8qjcbr6",
          "from": {
            "item": "ip7968kw",
            "terminal": "B8"
          },
          "to": {
            "item": "ijwi2gz3",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "whx8yonb",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B2"
          },
          "to": {
            "item": "i7gj41i7",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wpwrryx2",
          "from": {
            "item": "i7gj41i7",
            "terminal": "B0"
          },
          "to": {
            "item": "iuyfd3gh",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w08zi39q",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B9"
          },
          "to": {
            "item": "iuyfd3gh",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w09pquua",
          "from": {
            "item": "ip7968kw",
            "terminal": "B9"
          },
          "to": {
            "item": "iuyfd3gh",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wgeofqby",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B0"
          },
          "to": {
            "item": "ixf44myx",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wfs64jpc",
          "from": {
            "item": "ixf44myx",
            "terminal": "B0"
          },
          "to": {
            "item": "ioyqeofc",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wyefb1oe",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B10"
          },
          "to": {
            "item": "ioyqeofc",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w886fdpf",
          "from": {
            "item": "ip7968kw",
            "terminal": "B10"
          },
          "to": {
            "item": "ioyqeofc",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wy1bwv4t",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B1"
          },
          "to": {
            "item": "iztoiith",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wo38wc3k",
          "from": {
            "item": "iztoiith",
            "terminal": "B0"
          },
          "to": {
            "item": "inzaf1zx",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w2lofcok",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B11"
          },
          "to": {
            "item": "inzaf1zx",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wt65tquf",
          "from": {
            "item": "ip7968kw",
            "terminal": "B11"
          },
          "to": {
            "item": "inzaf1zx",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wrpyhvzs",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B2"
          },
          "to": {
            "item": "ititqz1t",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wfmdzk0x",
          "from": {
            "item": "ititqz1t",
            "terminal": "B0"
          },
          "to": {
            "item": "iq3zcg85",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wprmg4if",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B12"
          },
          "to": {
            "item": "iq3zcg85",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wkxrwgtn",
          "from": {
            "item": "ip7968kw",
            "terminal": "B12"
          },
          "to": {
            "item": "iq3zcg85",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w6nblw3s",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B0"
          },
          "to": {
            "item": "ife145l7",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w35bjlqn",
          "from": {
            "item": "ife145l7",
            "terminal": "B0"
          },
          "to": {
            "item": "is5x8iyh",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wv93w74c",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B13"
          },
          "to": {
            "item": "is5x8iyh",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wyiu8pg9",
          "from": {
            "item": "ip7968kw",
            "terminal": "B13"
          },
          "to": {
            "item": "is5x8iyh",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wmg0qezi",
          "from": {
            "item": "iz8hwlim",
            "terminal": "B1"
          },
          "to": {
            "item": "iagd03gv",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wr70rbtw",
          "from": {
            "item": "iagd03gv",
            "terminal": "B0"
          },
          "to": {
            "item": "i8fhbdw8",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "weig8xf2",
          "from": {
            "item": "iyt6i52f",
            "terminal": "B14"
          },
          "to": {
            "item": "i8fhbdw8",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wgpbxrs9",
          "from": {
            "item": "ip7968kw",
            "terminal": "B14"
          },
          "to": {
            "item": "i8fhbdw8",
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
      "id": "p4cpocox",
      "name": "Media cabinet",
      "floor": "3rd floor",
      "room": "Utility room",
      "code": "MC",
      "rails": [
        {
          "id": "m1",
          "modules": 12
        }
      ],
      "items": [
        {
          "id": "ie8fmkq9",
          "defId": "floor_port",
          "x": 21,
          "y": 410,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, 3rd floor",
          "link": {
            "circuit": "ckfoxkxj",
            "point": "pwey6nkp",
            "port": 0
          }
        },
        {
          "id": "ia408i4f",
          "defId": "floor_port",
          "x": 73,
          "y": 410,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ2.1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 1 of 2, 3rd floor",
          "link": {
            "circuit": "ckfoxkxj",
            "point": "pd69fyti",
            "port": 0
          }
        },
        {
          "id": "ircxwn4i",
          "defId": "floor_port",
          "x": 125,
          "y": 410,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ2.2",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 2 of 2, 3rd floor",
          "link": {
            "circuit": "ckfoxkxj",
            "point": "pd69fyti",
            "port": 1
          }
        },
        {
          "id": "iadh9hfp",
          "defId": "floor_port",
          "x": 177,
          "y": 410,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ3.1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 1 of 2, 3rd floor",
          "link": {
            "circuit": "ckfoxkxj",
            "point": "ppb9nz31",
            "port": 0
          }
        },
        {
          "id": "ilyexfuk",
          "defId": "floor_port",
          "x": 229,
          "y": 410,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: RJ3.2",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, port 2 of 2, 3rd floor",
          "link": {
            "circuit": "ckfoxkxj",
            "point": "ppb9nz31",
            "port": 1
          }
        },
        {
          "id": "i0eg9u4t",
          "defId": "floor_port",
          "x": 21,
          "y": 458,
          "poleConfig": "1P",
          "params": {
            "medium": "network"
          },
          "on": true,
          "description": "Network: AP1",
          "manufacturer": "",
          "model": "",
          "note": "Cat6, 3rd floor",
          "link": {
            "circuit": "ckfoxkxj",
            "point": "pckuocme",
            "port": 0
          }
        },
        {
          "id": "iubkwwou",
          "defId": "floor_port",
          "x": 73,
          "y": 458,
          "poleConfig": "1P",
          "params": {
            "medium": "coax"
          },
          "on": true,
          "description": "TV antenna: TV1",
          "manufacturer": "",
          "model": "",
          "note": "RG6, 3rd floor",
          "link": {
            "circuit": "c8ca4kj0",
            "point": "p0873og0",
            "port": 0
          }
        },
        {
          "id": "i1ddmmgn",
          "defId": "floor_port",
          "x": 125,
          "y": 458,
          "poleConfig": "1P",
          "params": {
            "medium": "coax"
          },
          "on": true,
          "description": "TV antenna: TV2",
          "manufacturer": "",
          "model": "",
          "note": "RG6, 3rd floor",
          "link": {
            "circuit": "c8ca4kj0",
            "point": "pi4ffxwy",
            "port": 0
          }
        },
        {
          "id": "idhxzhou",
          "defId": "floor_port",
          "x": 177,
          "y": 458,
          "poleConfig": "1P",
          "params": {
            "medium": "fiber"
          },
          "on": true,
          "description": "Fibre: FO1",
          "manufacturer": "",
          "model": "",
          "note": "OS2 single-mode, 3rd floor",
          "link": {
            "circuit": "cmdeo5fm",
            "point": "ps801lbz",
            "port": 0
          }
        },
        {
          "id": "ivelfooq",
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
          "id": "wo6xzmsw",
          "from": {
            "item": "idhxzhou",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_0"
          },
          "color": "green",
          "nodes": null,
          "section": 0.5,
          "label": "FO1"
        },
        {
          "id": "whgyo40y",
          "from": {
            "item": "i0eg9u4t",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_1"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "AP1"
        },
        {
          "id": "w12rvfni",
          "from": {
            "item": "ie8fmkq9",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_2"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ1"
        },
        {
          "id": "wmbpt03h",
          "from": {
            "item": "ia408i4f",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_3"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ2.1"
        },
        {
          "id": "weg1dkgg",
          "from": {
            "item": "ircxwn4i",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_4"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ2.2"
        },
        {
          "id": "w5xfgupg",
          "from": {
            "item": "iadh9hfp",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_5"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ3.1"
        },
        {
          "id": "wyjv9scj",
          "from": {
            "item": "ilyexfuk",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_6"
          },
          "color": "blue",
          "nodes": null,
          "section": 0.5,
          "label": "RJ3.2"
        },
        {
          "id": "wjli4q5g",
          "from": {
            "item": "iubkwwou",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_7"
          },
          "color": "violet",
          "nodes": null,
          "section": 0.5,
          "label": "TV1"
        },
        {
          "id": "wkc8rjzg",
          "from": {
            "item": "i1ddmmgn",
            "terminal": "port"
          },
          "to": {
            "item": "ivelfooq",
            "terminal": "P0_8"
          },
          "color": "violet",
          "nodes": null,
          "section": 0.5,
          "label": "TV2"
        }
      ],
      "notes": "",
      "region": "eu",
      "usPhases": 2
    }
  ],
  "modules": [],
  "connectors": [],
  "floorPlans": [
    {
      "id": "fkx9wzvm",
      "name": "3rd floor",
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
      "shapes": [
        {
          "id": "s72sv8vg",
          "type": "rect",
          "x": 725,
          "y": 65,
          "w": 230,
          "h": 330,
          "stroke": "#2563eb",
          "strokeWidth": 4,
          "fill": "#3b82f6",
          "fillOpacity": 0.14,
          "layer": "floor"
        },
        {
          "id": "sgyyxrq7",
          "type": "text",
          "x": 742,
          "y": 175,
          "w": 0,
          "h": 0,
          "stroke": "#1d4ed8",
          "strokeWidth": 3,
          "fill": "none",
          "fillOpacity": 0.25,
          "layer": "ceiling",
          "text": "Wet area: IP44",
          "fontSize": 20
        }
      ],
      "w": 1400,
      "h": 900,
      "pxPerM": 100,
      "points": [
        {
          "id": "pqrni8uj",
          "kind": "light",
          "x": 200,
          "y": 460,
          "label": "L1",
          "count": 2,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "phlt1hhr",
          "kind": "light",
          "x": 470,
          "y": 460,
          "label": "L2",
          "count": 2,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "phj6wh9u",
          "kind": "light",
          "x": 740,
          "y": 460,
          "label": "L3",
          "count": 2,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "p6pjs8qd",
          "kind": "light",
          "x": 1000,
          "y": 460,
          "label": "L4",
          "count": 2,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "pliv5r6d",
          "kind": "light",
          "x": 720,
          "y": 670,
          "label": "L5",
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "pjvmg3vu",
          "kind": "light",
          "x": 400,
          "y": 640,
          "label": "L6",
          "count": 4,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "pcolsp43",
          "kind": "light",
          "x": 240,
          "y": 240,
          "label": "L7",
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "pnuimcsf",
          "kind": "light",
          "x": 570,
          "y": 230,
          "label": "L8",
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "po7tfze1",
          "kind": "light",
          "x": 840,
          "y": 200,
          "label": "L9",
          "count": 2,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "phcilj6k",
          "kind": "light",
          "x": 1100,
          "y": 240,
          "label": "L10",
          "count": 4,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "plo8r3bg",
          "kind": "light",
          "x": 1100,
          "y": 680,
          "label": "L11",
          "count": 2,
          "watts": 60,
          "layer": "ceiling"
        },
        {
          "id": "ppiq5tsa",
          "kind": "socket",
          "x": 95,
          "y": 590,
          "label": "S1",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "paqbnsed",
          "kind": "socket",
          "x": 95,
          "y": 740,
          "label": "S2",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "p52fv6ra",
          "kind": "amp",
          "x": 400,
          "y": 815,
          "label": "AMP1",
          "watts": 150,
          "channels": 5,
          "layer": "floor"
        },
        {
          "id": "p4qk05sk",
          "kind": "socket",
          "x": 470,
          "y": 755,
          "label": "S3",
          "watts": 150,
          "layer": "floor"
        },
        {
          "id": "pkd36iap",
          "kind": "socket",
          "x": 820,
          "y": 690,
          "label": "S4",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pbdnveyn",
          "kind": "socket",
          "x": 95,
          "y": 180,
          "label": "S5",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pxl36nr5",
          "kind": "socket",
          "x": 385,
          "y": 180,
          "label": "S6",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pi7qc5k0",
          "kind": "socket",
          "x": 240,
          "y": 385,
          "label": "S7",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "p6rmp010",
          "kind": "socket",
          "x": 560,
          "y": 100,
          "label": "S8",
          "count": 3,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pjqaxs41",
          "kind": "socket",
          "x": 1030,
          "y": 100,
          "label": "S9",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pd26pvo3",
          "kind": "socket",
          "x": 1130,
          "y": 100,
          "label": "S10",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pdzgq7f9",
          "kind": "socket",
          "x": 1310,
          "y": 165,
          "label": "FRIDGE",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pn7xr4yb",
          "kind": "socket",
          "x": 1190,
          "y": 300,
          "label": "S11",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pkta58q2",
          "kind": "appliance",
          "x": 1235,
          "y": 100,
          "label": "HOB",
          "watts": 5000,
          "phases": 2,
          "layer": "floor"
        },
        {
          "id": "p9pwzdiy",
          "kind": "appliance",
          "x": 1310,
          "y": 240,
          "label": "OVEN",
          "watts": 3000,
          "layer": "floor"
        },
        {
          "id": "pm9q4mp5",
          "kind": "appliance",
          "x": 1000,
          "y": 165,
          "label": "DISHW",
          "watts": 2000,
          "layer": "floor"
        },
        {
          "id": "pgneg7qn",
          "kind": "appliance",
          "x": 770,
          "y": 375,
          "label": "WASHER",
          "watts": 2300,
          "layer": "floor"
        },
        {
          "id": "p9p0lsjo",
          "kind": "socket",
          "x": 750,
          "y": 260,
          "label": "S12",
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pql07a3c",
          "kind": "appliance",
          "x": 935,
          "y": 580,
          "label": "BOILER",
          "watts": 2000,
          "layer": "floor"
        },
        {
          "id": "p9j3h5r0",
          "kind": "socket",
          "x": 1100,
          "y": 570,
          "label": "S13",
          "count": 2,
          "watts": 150,
          "layer": "walls"
        },
        {
          "id": "pwey6nkp",
          "kind": "network",
          "x": 120,
          "y": 385,
          "label": "RJ1",
          "layer": "walls"
        },
        {
          "id": "pd69fyti",
          "kind": "network",
          "x": 640,
          "y": 100,
          "label": "RJ2",
          "count": 2,
          "layer": "walls"
        },
        {
          "id": "ppb9nz31",
          "kind": "network",
          "x": 520,
          "y": 825,
          "label": "RJ3",
          "count": 2,
          "layer": "walls"
        },
        {
          "id": "pckuocme",
          "kind": "wifi",
          "x": 700,
          "y": 440,
          "label": "AP1",
          "layer": "ceiling"
        },
        {
          "id": "p0873og0",
          "kind": "tv",
          "x": 180,
          "y": 385,
          "label": "TV1",
          "layer": "walls"
        },
        {
          "id": "pi4ffxwy",
          "kind": "tv",
          "x": 470,
          "y": 825,
          "label": "TV2",
          "layer": "walls"
        },
        {
          "id": "ps801lbz",
          "kind": "fiber",
          "x": 1315,
          "y": 720,
          "label": "FO1",
          "layer": "walls"
        },
        {
          "id": "pu4jtpw9",
          "kind": "speaker",
          "x": 300,
          "y": 822,
          "label": "SP1",
          "layer": "walls"
        },
        {
          "id": "ppt4q1wg",
          "kind": "speaker",
          "x": 640,
          "y": 822,
          "label": "SP2",
          "layer": "walls"
        },
        {
          "id": "p1n3c22l",
          "kind": "speaker",
          "x": 110,
          "y": 545,
          "label": "SP3",
          "layer": "walls"
        },
        {
          "id": "pfu12m25",
          "kind": "speaker",
          "x": 810,
          "y": 545,
          "label": "SP4",
          "layer": "walls"
        }
      ],
      "panels": [
        {
          "id": "modu8ylc",
          "panelId": "pbk6qb0m",
          "x": 1230,
          "y": 460
        },
        {
          "id": "m3cqdh4k",
          "panelId": "p4cpocox",
          "x": 1280,
          "y": 640
        }
      ],
      "circuits": [
        {
          "id": "ca4taw4q",
          "name": "Lighting hall",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pqrni8uj"
            },
            {
              "point": "phlt1hhr"
            },
            {
              "point": "phj6wh9u"
            },
            {
              "point": "p6pjs8qd"
            }
          ],
          "layer": "ceiling",
          "panel": "modu8ylc"
        },
        {
          "id": "cqpsffv0",
          "name": "Lighting living room",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pliv5r6d"
            },
            {
              "point": "pjvmg3vu"
            }
          ],
          "layer": "ceiling",
          "run": [
            {
              "x": 392,
              "y": 640
            },
            {
              "x": 392,
              "y": 408
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "ctsecgth",
          "name": "Lighting bedrooms and bath",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pcolsp43"
            },
            {
              "point": "pnuimcsf"
            },
            {
              "point": "po7tfze1"
            }
          ],
          "layer": "ceiling",
          "run": [
            {
              "x": 812,
              "y": 200
            },
            {
              "x": 812,
              "y": 417
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "culik9ep",
          "name": "Lighting kitchen and utility",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "phcilj6k"
            },
            {
              "point": "plo8r3bg"
            }
          ],
          "layer": "ceiling",
          "run": [
            {
              "x": 972,
              "y": 680
            },
            {
              "x": 972,
              "y": 426
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "cvx3c65i",
          "name": "Sockets living room",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "ppiq5tsa"
            },
            {
              "point": "paqbnsed"
            },
            {
              "point": "p52fv6ra"
            },
            {
              "point": "p4qk05sk"
            },
            {
              "point": "pkd36iap"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 392,
              "y": 700
            },
            {
              "x": 392,
              "y": 408
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "c7wthf87",
          "name": "Sockets bedroom and office",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pbdnveyn"
            },
            {
              "point": "pxl36nr5"
            },
            {
              "point": "pi7qc5k0"
            },
            {
              "point": "p6rmp010"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 612,
              "y": 100
            },
            {
              "x": 612,
              "y": 435
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "c7dlt998",
          "name": "Sockets kitchen",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pjqaxs41"
            },
            {
              "point": "pd26pvo3"
            },
            {
              "point": "pdzgq7f9"
            },
            {
              "point": "pn7xr4yb"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 1072,
              "y": 300
            },
            {
              "x": 1072,
              "y": 444
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "cfnz3390",
          "name": "Hob (2 phases)",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pkta58q2"
            }
          ],
          "layer": "floor",
          "run": [
            {
              "x": 1072,
              "y": 100
            },
            {
              "x": 1072,
              "y": 444
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "crgrpp9y",
          "name": "Oven",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "p9pwzdiy"
            }
          ],
          "layer": "floor",
          "run": [
            {
              "x": 1072,
              "y": 240
            },
            {
              "x": 1072,
              "y": 444
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "cdndj005",
          "name": "Dishwasher",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pm9q4mp5"
            }
          ],
          "layer": "floor",
          "run": [
            {
              "x": 1072,
              "y": 165
            },
            {
              "x": 1072,
              "y": 444
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "c3tk630d",
          "name": "Washing machine",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pgneg7qn"
            }
          ],
          "layer": "floor",
          "run": [
            {
              "x": 812,
              "y": 375
            },
            {
              "x": 812,
              "y": 417
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "c02crykq",
          "name": "Bathroom socket",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "p9p0lsjo"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 812,
              "y": 260
            },
            {
              "x": 812,
              "y": 417
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "cqmnavq3",
          "name": "Water heater",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "pql07a3c"
            }
          ],
          "layer": "floor",
          "run": [
            {
              "x": 972,
              "y": 580
            },
            {
              "x": 972,
              "y": 426
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "cpnl6p4o",
          "name": "Utility sockets",
          "medium": "power",
          "topology": "chain",
          "cable": "3x1.5 mm²",
          "color": "#e8710a",
          "nodes": [
            {
              "point": "p9j3h5r0"
            }
          ],
          "layer": "walls",
          "run": [
            {
              "x": 972,
              "y": 570
            },
            {
              "x": 972,
              "y": 426
            }
          ],
          "panel": "modu8ylc"
        },
        {
          "id": "ckfoxkxj",
          "name": "Network",
          "medium": "network",
          "topology": "star",
          "cable": "Cat6",
          "color": "#2563eb",
          "nodes": [
            {
              "point": "pwey6nkp"
            },
            {
              "point": "pd69fyti"
            },
            {
              "point": "ppb9nz31"
            },
            {
              "point": "pckuocme"
            }
          ],
          "layer": "walls",
          "bends": {
            "pwey6nkp": [
              {
                "x": 328,
                "y": 385
              },
              {
                "x": 328,
                "y": 471
              },
              {
                "x": 1004,
                "y": 471
              },
              {
                "x": 1004,
                "y": 620
              }
            ],
            "pd69fyti": [
              {
                "x": 628,
                "y": 100
              },
              {
                "x": 628,
                "y": 480
              },
              {
                "x": 1004,
                "y": 480
              },
              {
                "x": 1004,
                "y": 620
              }
            ],
            "ppb9nz31": [
              {
                "x": 408,
                "y": 825
              },
              {
                "x": 408,
                "y": 489
              },
              {
                "x": 1004,
                "y": 489
              },
              {
                "x": 1004,
                "y": 620
              }
            ],
            "pckuocme": [
              {
                "x": 700,
                "y": 462
              },
              {
                "x": 1004,
                "y": 462
              },
              {
                "x": 1004,
                "y": 620
              }
            ]
          },
          "panel": "m3cqdh4k"
        },
        {
          "id": "c8ca4kj0",
          "name": "TV antenna",
          "medium": "coax",
          "topology": "star",
          "cable": "RG6",
          "color": "#9333ea",
          "nodes": [
            {
              "point": "p0873og0"
            },
            {
              "point": "pi4ffxwy"
            }
          ],
          "layer": "walls",
          "bends": {
            "p0873og0": [
              {
                "x": 344,
                "y": 385
              },
              {
                "x": 344,
                "y": 498
              },
              {
                "x": 1020,
                "y": 498
              },
              {
                "x": 1020,
                "y": 620
              }
            ],
            "pi4ffxwy": [
              {
                "x": 424,
                "y": 825
              },
              {
                "x": 424,
                "y": 507
              },
              {
                "x": 1020,
                "y": 507
              },
              {
                "x": 1020,
                "y": 620
              }
            ]
          },
          "panel": "m3cqdh4k"
        },
        {
          "id": "cmdeo5fm",
          "name": "Fibre",
          "medium": "fiber",
          "topology": "star",
          "cable": "OS2 single-mode",
          "color": "#0f9d58",
          "nodes": [
            {
              "point": "ps801lbz"
            }
          ],
          "layer": "walls",
          "panel": "m3cqdh4k"
        },
        {
          "id": "coqshuys",
          "name": "Living room speakers",
          "medium": "audio",
          "topology": "star",
          "cable": "2x1.5 mm² speaker cable",
          "color": "#0d9488",
          "nodes": [
            {
              "point": "pu4jtpw9"
            },
            {
              "point": "ppt4q1wg"
            },
            {
              "point": "p1n3c22l"
            },
            {
              "point": "pfu12m25"
            }
          ],
          "layer": "walls",
          "hub": "p52fv6ra"
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