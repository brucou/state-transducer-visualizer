# State transducer visualization tool
This online tool consists of one window where the state transducer specification is to be 
entered; a button which when click triggers the display the graph visualization for the 
transducer, and last a window holding the graph visualization itself.

The format for the specification is immediately derived from the transducer format `FSM_Dek` from
 our [state machine library](https://github.com/brucou/state-transducer) with the following rules :
 
 - we only keep the properties `states` and `transitions` from `FSM_Def`
 - functions (e.g. predicates and actions) are replaced by their name

We thus end like with a JSON-like format.

The initial window starts with the example specification for a CD player : 

```JSON

  {
    "states": ["nok", [
      ["no_cd_loaded", [
        "cd_drawer_closed",
        "cd_drawer_open",
        "closing_cd_drawer"
      ]],
      ["cd_loaded", [
        ["cd_loaded_group", [
          ["cd_paused_group", [
            "time_and_track_fields_not_blank",
            "time_and_track_fields_blank"
          ]],
          "cd_playing",
          "cd_stopped"
        ]],
        "stepping_forwards",
        "stepping_backwards"
      ]]
    ]],
    "transitions": [
      { "from": "nok", "to": "no_cd_loaded", "event": "init", "action": "fsm_initialize_model" },
      { "from": "no_cd_loaded", "to": "cd_drawer_closed", "event": "init", "action": "identity" },
      { "from": "cd_drawer_closed", "to": "cd_drawer_open", "event": "EJECT", "action": "open_drawer" },
      { "from": "cd_drawer_open", "to": "closing_cd_drawer", "event": "EJECT", "action": "close_drawer" },
      {
        "from": "closing_cd_drawer", "guards": [
          { "predicate": "is_not_cd_in_drawer", "to": "cd_drawer_closed", "action": "identity" },
          { "predicate": "is_cd_in_drawer", "to": "cd_loaded", "action": "identity" }
        ]
      },
      { "from": "cd_loaded", "to": "cd_loaded_group", "event": "init", "action": "identity" },
      { "from": "cd_playing", "to": "cd_paused_group", "event": "PAUSE", "action": "pause_playing_cd" },
      { "from": "cd_paused_group", "to": "cd_playing", "event": "PAUSE", "action": "resume_paused_cd" },
      { "from": "cd_paused_group", "to": "cd_playing", "event": "PLAY", "action": "resume_paused_cd" },
      { "from": "cd_paused_group", "to": "time_and_track_fields_not_blank", "event": "init", "action": "identity" },
      {
        "from": "time_and_track_fields_not_blank",
        "to": "time_and_track_fields_blank",
        "event": "TIMER_EXPIRED",
        "action": "create_pause_timer"
      },
      {
        "from": "time_and_track_fields_blank",
        "to": "time_and_track_fields_not_blank",
        "event": "TIMER_EXPIRED",
        "action": "create_pause_timer"
      },
      { "from": "cd_paused_group", "to": "cd_stopped", "event": "STOP", "action": "stop" },
      { "from": "cd_stopped", "to": "cd_playing", "event": "PLAY", "action": "play" },
      { "from": "cd_playing", "to": "cd_stopped", "event": "STOP", "action": "stop" },
      { "from": "cd_loaded_group", "to": "cd_stopped", "event": "init", "action": "stop" },
      {
        "from": "cd_loaded_group", "event": "NEXT_TRACK", "guards": [
          { "predicate": "is_last_track", "to": "cd_stopped", "action": "stop" },
          { "predicate": "is_not_last_track", "to": "history.cd_loaded_group", "action": "go_next_track" }
        ]
      },
      {
        "from": "cd_loaded_group", "event": "PREVIOUS_TRACK", "guards": [
          { "predicate": "is_track_gt_1", "to": "history.cd_loaded_group", "action": "go_previous_track" },
          { "predicate": "is_track_eq_1", "to": "history.cd_loaded_group", "action": "go_track_1" }
        ]
      },
      { "from": "cd_loaded", "to": "cd_drawer_open", "event": "EJECT", "action": "eject" },
      {
        "from": "stepping_forwards", "event": "TIMER_EXPIRED", "guards": [
          { "predicate": "is_not_end_of_cd", "to": "stepping_forwards", "action": "go_forward_1_s" },
          { "predicate": "is_end_of_cd", "to": "cd_stopped", "action": "stop" }
        ]
      },
      { "from": "stepping_forwards", "to": "history.cd_loaded_group", "event": "FORWARD_UP", "action": "stop_forward_timer" },
      { "from": "cd_loaded_group", "to": "stepping_forwards", "event": "FORWARD_DOWN", "action": "go_forward_1_s" },
      { "from": "stepping_backwards", "to": "stepping_backwards", "event": "TIMER_EXPIRED", "action": "go_backward_1_s" },
      { "from": "stepping_backwards", "to": "history.cd_loaded_group", "event": "REVERSE_UP", "action": "stop_backward_timer" },
      { "from": "cd_loaded_group", "to": "stepping_backwards", "event": "REVERSE_DOWN", "action": "go_backward_1_s" }
    ]
  }
```

# Adjusting
Dagre does some nice visualizations. However they often have to be manually adjusted. We use 
cytoscape as a graph visualization library as it allows to adjust the graph manually. Here is the
 result of a manual adjustment :

![cd-player-dagre](./assets/cd-player-dagre-visually-adjusted.png)

For information, PlantUML not so good for visualizing complex state machines. But could be 
customizable? The SVG 
generated can be customized in any case.

![plantuml](./assets/bLRRQjj0.svg)

## Quick start
`npm run parcel`

## Features


## Documentation

## Contributing

Anyone is welcome to [contribute](.github/CONTRIBUTING.md),
however, if you decide to get involved, please take a moment to review
the [guidelines](.github/CONTRIBUTING.md):

* [Bug reports](.github/CONTRIBUTING.md#bugs)
* [Feature requests](.github/CONTRIBUTING.md#features)
* [Pull requests](.github/CONTRIBUTING.md#pull-requests)


## License

The code is available under the [MIT license](LICENSE.txt).
