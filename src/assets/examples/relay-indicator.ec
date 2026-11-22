{
  "format": "electrocraft",
  "version": 1,
  "name": "Relay with indicator light",
  "author": "",
  "revision": "A",
  "created": "2026-11-19T17:12:03.951Z",
  "modified": "2026-11-19T17:12:03.951Z",
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
      "id": "prcqxfrr",
      "name": "Control relay",
      "floor": "Ground floor",
      "room": "",
      "code": "K1",
      "rails": [
        {
          "id": "r0",
          "modules": 14
        }
      ],
      "items": [
        {
          "id": "isszj1ov",
          "defId": "supply",
          "x": 40,
          "y": -240,
          "poleConfig": "1P",
          "params": {
            "phases": 1,
            "In": 32,
            "Un": 230,
            "feeder": "5x10 mm²"
          },
          "on": true,
          "description": "Supply",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "i7qm8sdy",
          "defId": "switch",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 16,
            "Un": 230
          },
          "on": true,
          "description": "Coil switch",
          "manufacturer": "",
          "model": "",
          "railId": "r0",
          "slot": 1
        },
        {
          "id": "i3br69ro",
          "defId": "mod-zduziny",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 10,
            "Un": 230
          },
          "on": true,
          "description": "Control relay (changeover)",
          "manufacturer": "",
          "model": "",
          "railId": "r0",
          "slot": 5
        },
        {
          "id": "in946ouh",
          "defId": "load",
          "x": 40,
          "y": 480,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 100,
            "cosphi": 1
          },
          "on": true,
          "description": "Lamp",
          "manufacturer": "",
          "model": ""
        }
      ],
      "wires": [
        {
          "id": "wktcdjdm",
          "from": {
            "item": "isszj1ov",
            "terminal": "L1"
          },
          "to": {
            "item": "i7qm8sdy",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w60pmeor",
          "from": {
            "item": "i7qm8sdy",
            "terminal": "B0"
          },
          "to": {
            "item": "i3br69ro",
            "terminal": "T0_0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wmegonv8",
          "from": {
            "item": "isszj1ov",
            "terminal": "N"
          },
          "to": {
            "item": "i3br69ro",
            "terminal": "B0_0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w7btrlcv",
          "from": {
            "item": "isszj1ov",
            "terminal": "L1"
          },
          "to": {
            "item": "i3br69ro",
            "terminal": "T0_1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "w121uxow",
          "from": {
            "item": "i3br69ro",
            "terminal": "B0_1"
          },
          "to": {
            "item": "in946ouh",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wfd8sk5y",
          "from": {
            "item": "isszj1ov",
            "terminal": "N"
          },
          "to": {
            "item": "in946ouh",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        }
      ],
      "notes": ""
    },
    {
      "id": "p7serqwy",
      "name": "Impulse relay",
      "floor": "Ground floor",
      "room": "",
      "code": "K2",
      "rails": [
        {
          "id": "r1",
          "modules": 14
        }
      ],
      "items": [
        {
          "id": "iskjcfth",
          "defId": "supply",
          "x": 40,
          "y": -240,
          "poleConfig": "1P",
          "params": {
            "phases": 1,
            "In": 32,
            "Un": 230,
            "feeder": "5x10 mm²"
          },
          "on": true,
          "description": "Supply",
          "manufacturer": "",
          "model": ""
        },
        {
          "id": "iam9rxpa",
          "defId": "switch",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 16,
            "Un": 230
          },
          "on": false,
          "description": "Pulse switch",
          "manufacturer": "",
          "model": "",
          "railId": "r1",
          "slot": 1
        },
        {
          "id": "iikh54lf",
          "defId": "mod-hsqbsa7",
          "x": 0,
          "y": 0,
          "poleConfig": "1P",
          "params": {
            "In": 10,
            "Un": 230
          },
          "on": true,
          "description": "Impulse relay",
          "manufacturer": "",
          "model": "",
          "railId": "r1",
          "slot": 5
        },
        {
          "id": "i61xnde1",
          "defId": "load",
          "x": 40,
          "y": 480,
          "poleConfig": "1P",
          "params": {
            "kind": "lamp",
            "phases": 1,
            "P": 100,
            "cosphi": 1
          },
          "on": true,
          "description": "Lamp",
          "manufacturer": "",
          "model": ""
        }
      ],
      "wires": [
        {
          "id": "wcf8wo11",
          "from": {
            "item": "iskjcfth",
            "terminal": "L1"
          },
          "to": {
            "item": "iam9rxpa",
            "terminal": "T0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wkra3gbm",
          "from": {
            "item": "iam9rxpa",
            "terminal": "B0"
          },
          "to": {
            "item": "iikh54lf",
            "terminal": "T0_0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wg0rxh8n",
          "from": {
            "item": "iskjcfth",
            "terminal": "N"
          },
          "to": {
            "item": "iikh54lf",
            "terminal": "B0_0"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "we6vf8yu",
          "from": {
            "item": "iskjcfth",
            "terminal": "L1"
          },
          "to": {
            "item": "iikh54lf",
            "terminal": "T0_1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wdtslwj4",
          "from": {
            "item": "iikh54lf",
            "terminal": "B0_1"
          },
          "to": {
            "item": "i61xnde1",
            "terminal": "L1"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        },
        {
          "id": "wyavdtbv",
          "from": {
            "item": "iskjcfth",
            "terminal": "N"
          },
          "to": {
            "item": "i61xnde1",
            "terminal": "N"
          },
          "color": "auto",
          "nodes": null,
          "section": 2.5
        }
      ],
      "notes": ""
    }
  ],
  "modules": [
    {
      "id": "mod-zduziny",
      "name": "Control relay (indicator)",
      "description": "Coil A1/A2 operates one changeover contact. The lamp on the face lights while the coil is energised.",
      "designation": "K",
      "widthModules": 2,
      "heightMm": 90,
      "color": "#e6eaef",
      "stroke": "#69747f",
      "rating": {
        "In": 10,
        "Un": 230
      },
      "behaviour": "isolated",
      "switchable": false,
      "trips": false,
      "switches": [
        {
          "id": "kcont",
          "name": "K",
          "no": [
            "T0_1",
            "B0_1"
          ],
          "nc": [
            "T0_1",
            "B0_2"
          ],
          "visible": false,
          "x": 18,
          "y": 50
        }
      ],
      "inputs": [
        {
          "id": "kcoil",
          "name": "COIL",
          "terminal": "T0_0",
          "ref": "B0_0",
          "mode": "momentary",
          "targets": [
            "kcont"
          ]
        }
      ],
      "top": {
        "rows": 1,
        "cols": 2
      },
      "bottom": {
        "rows": 1,
        "cols": 3
      },
      "terminals": [
        {
          "id": "T0_0",
          "side": "top",
          "row": 0,
          "col": 0,
          "label": "A1",
          "net": "solo:T0_0"
        },
        {
          "id": "T0_1",
          "side": "top",
          "row": 0,
          "col": 1,
          "label": "11",
          "net": "solo:T0_1"
        },
        {
          "id": "B0_0",
          "side": "bottom",
          "row": 0,
          "col": 0,
          "label": "A2",
          "net": "solo:B0_0"
        },
        {
          "id": "B0_1",
          "side": "bottom",
          "row": 0,
          "col": 1,
          "label": "14",
          "net": "solo:B0_1"
        },
        {
          "id": "B0_2",
          "side": "bottom",
          "row": 0,
          "col": 2,
          "label": "12",
          "net": "solo:B0_2"
        }
      ],
      "shapes": [
        {
          "id": "spvuozi8",
          "name": "Title",
          "type": "text",
          "x": 18,
          "y": 30,
          "w": 10,
          "h": 8,
          "r": 4,
          "rx": 0.8,
          "fill": "#1f2630",
          "stroke": "none",
          "strokeWidth": 0.3,
          "opacity": 1,
          "text": "K",
          "fontSize": 8,
          "show": "always"
        },
        {
          "id": "s0l5d3kx",
          "name": "Coil lamp",
          "type": "circle",
          "x": 18,
          "y": 46,
          "w": 10,
          "h": 8,
          "r": 3,
          "rx": 0.8,
          "fill": "#7a8794",
          "stroke": "#14631f",
          "strokeWidth": 0.3,
          "opacity": 1,
          "text": "",
          "fontSize": 4,
          "show": "always",
          "activeWhen": "in:kcoil",
          "activeFill": "#2fbf4f"
        }
      ]
    },
    {
      "id": "mod-hsqbsa7",
      "name": "Impulse relay",
      "description": "Each pulse on A1/A2 toggles the contact 11-14 (latching)",
      "designation": "K",
      "widthModules": 2,
      "heightMm": 90,
      "color": "#e6eaef",
      "stroke": "#69747f",
      "rating": {
        "In": 10,
        "Un": 230
      },
      "behaviour": "isolated",
      "switchable": false,
      "trips": false,
      "switches": [
        {
          "id": "kimp",
          "name": "K",
          "no": [
            "T0_1",
            "B0_1"
          ],
          "nc": [],
          "visible": false,
          "x": 18,
          "y": 50
        }
      ],
      "inputs": [
        {
          "id": "kcoil",
          "name": "PULSE",
          "terminal": "T0_0",
          "ref": "B0_0",
          "mode": "toggle",
          "targets": [
            "kimp"
          ]
        }
      ],
      "top": {
        "rows": 1,
        "cols": 2
      },
      "bottom": {
        "rows": 1,
        "cols": 2
      },
      "terminals": [
        {
          "id": "T0_0",
          "side": "top",
          "row": 0,
          "col": 0,
          "label": "A1",
          "net": "solo:T0_0"
        },
        {
          "id": "T0_1",
          "side": "top",
          "row": 0,
          "col": 1,
          "label": "11",
          "net": "solo:T0_1"
        },
        {
          "id": "B0_0",
          "side": "bottom",
          "row": 0,
          "col": 0,
          "label": "A2",
          "net": "solo:B0_0"
        },
        {
          "id": "B0_1",
          "side": "bottom",
          "row": 0,
          "col": 1,
          "label": "14",
          "net": "solo:B0_1"
        }
      ],
      "shapes": [
        {
          "id": "sk6xnypf",
          "name": "Title",
          "type": "text",
          "x": 18,
          "y": 30,
          "w": 10,
          "h": 8,
          "r": 4,
          "rx": 0.8,
          "fill": "#1f2630",
          "stroke": "none",
          "strokeWidth": 0.3,
          "opacity": 1,
          "text": "IMPULSE",
          "fontSize": 5,
          "show": "always"
        },
        {
          "id": "sltweu5w",
          "name": "Contact closed (lamp)",
          "type": "circle",
          "x": 18,
          "y": 46,
          "w": 10,
          "h": 8,
          "r": 3,
          "rx": 0.8,
          "fill": "#d9a83f",
          "stroke": "#7a5a10",
          "strokeWidth": 0.3,
          "opacity": 1,
          "text": "",
          "fontSize": 4,
          "show": "sw:kimp"
        },
        {
          "id": "szkr0vgn",
          "name": "Contact open (lamp)",
          "type": "circle",
          "x": 18,
          "y": 46,
          "w": 10,
          "h": 8,
          "r": 3,
          "rx": 0.8,
          "fill": "#7a8794",
          "stroke": "#4c5560",
          "strokeWidth": 0.3,
          "opacity": 1,
          "text": "",
          "fontSize": 4,
          "show": "rel:kimp"
        }
      ]
    }
  ]
}