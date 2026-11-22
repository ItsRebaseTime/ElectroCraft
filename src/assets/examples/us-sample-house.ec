{
  "format": "electrocraft",
  "version": 1,
  "name": "US sample house",
  "author": "",
  "revision": "A",
  "created": "2026-11-21T08:46:45.073Z",
  "modified": "2026-11-21T08:46:45.074Z",
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
      "id": "pvrpwjxl",
      "name": "Main panel",
      "floor": "Ground floor",
      "room": "Garage",
      "code": "MDP",
      "rails": [
        {
          "id": "r98ltzf2",
          "modules": 12
        },
        {
          "id": "rwqhls4j",
          "modules": 12
        }
      ],
      "items": [
        {
          "id": "ifhy8t6f",
          "defId": "us_supply",
          "x": 60,
          "y": -240,
          "poleConfig": "1P",
          "params": {
            "phases": 2,
            "In": 200,
            "Un": 120,
            "feeder": "2/0 AWG"
          },
          "on": true,
          "description": "Utility service",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "i4njgw90",
          "defId": "us_main",
          "x": 73,
          "y": 14,
          "poleConfig": "2P",
          "params": {
            "In": 200
          },
          "on": true,
          "description": "",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "iri7p0fh",
          "defId": "us_neutral_bar",
          "x": 20,
          "y": 332,
          "poleConfig": "1P",
          "params": {
            "count": 8
          },
          "on": true,
          "description": "Neutral bar",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "i2ydb78u",
          "defId": "us_ground_bar",
          "x": 136,
          "y": 332,
          "poleConfig": "1P",
          "params": {
            "count": 8
          },
          "on": true,
          "description": "Ground bar",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "iktb31cc",
          "defId": "us_breaker",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 15,
            "type": "AFCI",
            "Icn": 10000
          },
          "on": true,
          "description": "Bedroom lights",
          "manufacturer": "",
          "model": "",
          "railId": "r98ltzf2",
          "slot": 0
        },
        {
          "id": "i1sklw8f",
          "defId": "us_breaker",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 20,
            "type": "GFCI",
            "Icn": 10000
          },
          "on": true,
          "description": "Kitchen receptacles",
          "manufacturer": "",
          "model": "",
          "railId": "r98ltzf2",
          "slot": 1
        },
        {
          "id": "il3mhxrv",
          "defId": "us_breaker",
          "x": 0,
          "y": 0,
          "poleConfig": "2P",
          "params": {
            "In": 30,
            "type": "STD",
            "Icn": 10000
          },
          "on": true,
          "description": "Air conditioner",
          "manufacturer": "",
          "model": "",
          "railId": "r98ltzf2",
          "slot": 2
        },
        {
          "id": "i7diymyv",
          "defId": "us_breaker",
          "x": 0,
          "y": 0,
          "poleConfig": "2P",
          "params": {
            "In": 40,
            "type": "STD",
            "Icn": 10000
          },
          "on": true,
          "description": "Range",
          "manufacturer": "",
          "model": "",
          "railId": "rwqhls4j",
          "slot": 0
        },
        {
          "id": "ihgmrb5d",
          "defId": "us_breaker",
          "x": 0,
          "y": 0,
          "poleConfig": "2P",
          "params": {
            "In": 30,
            "type": "STD",
            "Icn": 10000
          },
          "on": true,
          "description": "Dryer",
          "manufacturer": "",
          "model": "",
          "railId": "rwqhls4j",
          "slot": 2
        },
        {
          "id": "ifx359kt",
          "defId": "load",
          "x": -190,
          "y": 468,
          "poleConfig": "1P",
          "params": {
            "cosphi": 1,
            "kind": "lamp",
            "phases": 1,
            "P": 480
          },
          "on": true,
          "description": "Bedroom lights",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "ixqq2sul",
          "defId": "load",
          "x": -65,
          "y": 468,
          "poleConfig": "1P",
          "params": {
            "cosphi": 1,
            "kind": "socket",
            "phases": 1,
            "P": 1500
          },
          "on": true,
          "description": "Kitchen receptacles",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "ikex8800",
          "defId": "load",
          "x": 60,
          "y": 468,
          "poleConfig": "1P",
          "params": {
            "cosphi": 0.9,
            "kind": "motor",
            "phases": 2,
            "P": 3500
          },
          "on": true,
          "description": "Air conditioner",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "ignxm3lp",
          "defId": "load",
          "x": 185,
          "y": 468,
          "poleConfig": "1P",
          "params": {
            "cosphi": 1,
            "kind": "heater",
            "phases": 2,
            "P": 8000
          },
          "on": true,
          "description": "Range",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "ite8lub1",
          "defId": "load",
          "x": 310,
          "y": 468,
          "poleConfig": "1P",
          "params": {
            "cosphi": 1,
            "kind": "heater",
            "phases": 2,
            "P": 5000
          },
          "on": true,
          "description": "Dryer",
          "manufacturer": "",
          "model": ""
        }
      ],
      "wires": [
        {
          "id": "woib7cwm",
          "from": {
            "item": "ifhy8t6f",
            "terminal": "L1"
          },
          "to": {
            "item": "i4njgw90",
            "terminal": "line0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "2/0"
        },
        {
          "id": "wubm20tg",
          "from": {
            "item": "ifhy8t6f",
            "terminal": "L2"
          },
          "to": {
            "item": "i4njgw90",
            "terminal": "line1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "2/0"
        },
        {
          "id": "w103c186",
          "from": {
            "item": "ifhy8t6f",
            "terminal": "N"
          },
          "to": {
            "item": "iri7p0fh",
            "terminal": "term0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "2/0"
        },
        {
          "id": "wjjha1dw",
          "from": {
            "item": "ifhy8t6f",
            "terminal": "PE"
          },
          "to": {
            "item": "i2ydb78u",
            "terminal": "term0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "4"
        },
        {
          "id": "wgs8ygox",
          "from": {
            "item": "iktb31cc",
            "terminal": "load0"
          },
          "to": {
            "item": "ifx359kt",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "14"
        },
        {
          "id": "wtvtwefr",
          "from": {
            "item": "i1sklw8f",
            "terminal": "load0"
          },
          "to": {
            "item": "ixqq2sul",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "wknqmzbk",
          "from": {
            "item": "il3mhxrv",
            "terminal": "load0"
          },
          "to": {
            "item": "ikex8800",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "10"
        },
        {
          "id": "w4dq0wxf",
          "from": {
            "item": "il3mhxrv",
            "terminal": "load1"
          },
          "to": {
            "item": "ikex8800",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "10"
        },
        {
          "id": "wkizb6my",
          "from": {
            "item": "i7diymyv",
            "terminal": "load0"
          },
          "to": {
            "item": "ignxm3lp",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "8"
        },
        {
          "id": "wl4l3y67",
          "from": {
            "item": "i7diymyv",
            "terminal": "load1"
          },
          "to": {
            "item": "ignxm3lp",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "8"
        },
        {
          "id": "wxxjjstu",
          "from": {
            "item": "ihgmrb5d",
            "terminal": "load0"
          },
          "to": {
            "item": "ite8lub1",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "10"
        },
        {
          "id": "ww5isvlv",
          "from": {
            "item": "ihgmrb5d",
            "terminal": "load1"
          },
          "to": {
            "item": "ite8lub1",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "10"
        },
        {
          "id": "wr8kqh3p",
          "from": {
            "item": "iri7p0fh",
            "terminal": "term1"
          },
          "to": {
            "item": "ifx359kt",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "14"
        },
        {
          "id": "w4nihwmu",
          "from": {
            "item": "iri7p0fh",
            "terminal": "term2"
          },
          "to": {
            "item": "ixqq2sul",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "wm1jde38",
          "from": {
            "item": "i2ydb78u",
            "terminal": "term1"
          },
          "to": {
            "item": "ifx359kt",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "14"
        },
        {
          "id": "wshegx9l",
          "from": {
            "item": "i2ydb78u",
            "terminal": "term2"
          },
          "to": {
            "item": "ixqq2sul",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "wxjwrdx3",
          "from": {
            "item": "i2ydb78u",
            "terminal": "term3"
          },
          "to": {
            "item": "ikex8800",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "wqd0zq4t",
          "from": {
            "item": "i2ydb78u",
            "terminal": "term4"
          },
          "to": {
            "item": "ignxm3lp",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "wzgs3gvw",
          "from": {
            "item": "i2ydb78u",
            "terminal": "term5"
          },
          "to": {
            "item": "ite8lub1",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        }
      ],
      "notes": "",
      "region": "us",
      "usPhases": 2
    }
  ],
  "modules": [],
  "floorPlans": []
}