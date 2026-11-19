{
  "format": "electrocraft",
  "version": 1,
  "name": "US sample house",
  "author": "",
  "revision": "A",
  "created": "2026-11-19T16:25:33.532Z",
  "modified": "2026-11-19T16:25:33.533Z",
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
      "id": "p9cztkz4",
      "name": "Main panel",
      "floor": "Ground floor",
      "room": "Garage",
      "code": "MDP",
      "rails": [
        {
          "id": "r5crf993",
          "modules": 12
        },
        {
          "id": "rgxx30kr",
          "modules": 12
        }
      ],
      "items": [
        {
          "id": "imnh3ol6",
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
          "id": "ikfweety",
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
          "id": "iircvxb0",
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
          "id": "iwylb2be",
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
          "id": "irl8tz78",
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
          "railId": "r5crf993",
          "slot": 0
        },
        {
          "id": "igtqaoms",
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
          "railId": "r5crf993",
          "slot": 1
        },
        {
          "id": "istavgzy",
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
          "railId": "r5crf993",
          "slot": 2
        },
        {
          "id": "i78gq1uw",
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
          "railId": "rgxx30kr",
          "slot": 0
        },
        {
          "id": "ic6i8afb",
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
          "railId": "rgxx30kr",
          "slot": 2
        },
        {
          "id": "iu3b6uqf",
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
          "id": "iomps00z",
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
          "id": "iw6egvx5",
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
          "id": "iwls5067",
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
          "id": "iu1vmrzd",
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
          "id": "wisimb0m",
          "from": {
            "item": "imnh3ol6",
            "terminal": "L1"
          },
          "to": {
            "item": "ikfweety",
            "terminal": "line0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "2/0"
        },
        {
          "id": "wsrbdz1s",
          "from": {
            "item": "imnh3ol6",
            "terminal": "L2"
          },
          "to": {
            "item": "ikfweety",
            "terminal": "line1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "2/0"
        },
        {
          "id": "w9vtt4a6",
          "from": {
            "item": "imnh3ol6",
            "terminal": "N"
          },
          "to": {
            "item": "iircvxb0",
            "terminal": "term0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "2/0"
        },
        {
          "id": "wjocd2iu",
          "from": {
            "item": "imnh3ol6",
            "terminal": "PE"
          },
          "to": {
            "item": "iwylb2be",
            "terminal": "term0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "4"
        },
        {
          "id": "w6rx85z2",
          "from": {
            "item": "irl8tz78",
            "terminal": "load0"
          },
          "to": {
            "item": "iu3b6uqf",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "14"
        },
        {
          "id": "w727j3jz",
          "from": {
            "item": "igtqaoms",
            "terminal": "load0"
          },
          "to": {
            "item": "iomps00z",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "wwsge3l8",
          "from": {
            "item": "istavgzy",
            "terminal": "load0"
          },
          "to": {
            "item": "iw6egvx5",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "10"
        },
        {
          "id": "wgthux4y",
          "from": {
            "item": "istavgzy",
            "terminal": "load1"
          },
          "to": {
            "item": "iw6egvx5",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "10"
        },
        {
          "id": "w6ecarrc",
          "from": {
            "item": "i78gq1uw",
            "terminal": "load0"
          },
          "to": {
            "item": "iwls5067",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "8"
        },
        {
          "id": "w81q8eg2",
          "from": {
            "item": "i78gq1uw",
            "terminal": "load1"
          },
          "to": {
            "item": "iwls5067",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "8"
        },
        {
          "id": "wpr4ixud",
          "from": {
            "item": "ic6i8afb",
            "terminal": "load0"
          },
          "to": {
            "item": "iu1vmrzd",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "10"
        },
        {
          "id": "wfjixgnr",
          "from": {
            "item": "ic6i8afb",
            "terminal": "load1"
          },
          "to": {
            "item": "iu1vmrzd",
            "terminal": "L2"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "10"
        },
        {
          "id": "wm61iqlg",
          "from": {
            "item": "iircvxb0",
            "terminal": "term1"
          },
          "to": {
            "item": "iu3b6uqf",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "14"
        },
        {
          "id": "wlom1ya1",
          "from": {
            "item": "iircvxb0",
            "terminal": "term2"
          },
          "to": {
            "item": "iomps00z",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "wqis4vq9",
          "from": {
            "item": "iwylb2be",
            "terminal": "term1"
          },
          "to": {
            "item": "iu3b6uqf",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "14"
        },
        {
          "id": "wvzrwxlw",
          "from": {
            "item": "iwylb2be",
            "terminal": "term2"
          },
          "to": {
            "item": "iomps00z",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "w1013xwz",
          "from": {
            "item": "iwylb2be",
            "terminal": "term3"
          },
          "to": {
            "item": "iw6egvx5",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "w413upp9",
          "from": {
            "item": "iwylb2be",
            "terminal": "term4"
          },
          "to": {
            "item": "iwls5067",
            "terminal": "PE"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5,
          "awg": "12"
        },
        {
          "id": "wl459fc5",
          "from": {
            "item": "iwylb2be",
            "terminal": "term5"
          },
          "to": {
            "item": "iu1vmrzd",
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
  "modules": []
}