var state_hierarchy = {
  no_cd_loaded: {
    cd_drawer_closed: '', cd_drawer_open: '', closing_cd_drawer: ''
  },
  cd_loaded: {
    cd_loaded_group: {
      cd_paused_group: {
        time_and_track_fields_not_blank: '', time_and_track_fields_blank: ''
      },
      cd_playing: '',
      cd_stopped: ''
    },
    stepping_forwards: '',
    stepping_backwards: ''
  }
};

let states = ['root', [
  ['no_cd_loaded', [
    "no_cd_loaded",
    "cd_drawer_open",
    "closing_cd_drawer"
  ]],
  ['cd_loaded', [
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
]];

let transitions = [
  { from: "NOK", to: "no_cd_loaded", event: "INIT", action: "fsm_initialize_model" },
  { from: "no_cd_loaded", to: "cd_drawer_closed", event: "INIT", action: "identity" },
  { from: "cd_drawer_closed", to: "cd_drawer_open", event: "EJECT", action: "open_drawer" },
  { from: "cd_drawer_open", to: "closing_cd_drawer", event: "EJECT", action: "close_drawer" },
  {
    from: "closing_cd_drawer", guards: [
      { predicate: "is_not_cd_in_drawer", to: "no_cd_loaded", action: "identity" },
      { predicate: "is_cd_in_drawer", to: "cd_loaded", action: "identity" }
    ]
  },
  { from: "cd_loaded", to: "cd_loaded_group", event: "INIT", action: "identity" },
  { from: "cd_playing", to: "cd_paused_group", event: "PAUSE", action: "pause_playing_cd" },
  { from: "cd_paused_group", to: "cd_playing", event: "PAUSE", action: "resume_paused_cd" },
  { from: "cd_paused_group", to: "cd_playing", event: "PLAY", action: "resume_paused_cd" },
  { from: "cd_paused_group", to: "time_and_track_fields_not_blank", event: "INIT", action: "identity" },
  {
    from: "time_and_track_fields_not_blank",
    to: "time_and_track_fields_blank",
    event: "TIMER_EXPIRED",
    action: "create_pause_timer"
  },
  {
    from: "time_and_track_fields_blank",
    to: "time_and_track_fields_not_blank",
    event: "TIMER_EXPIRED",
    action: "create_pause_timer"
  },
  { from: "cd_paused_group", to: "cd_stopped", event: "STOP", action: "stop" },
  { from: "cd_stopped", to: "cd_playing", event: "PLAY", action: "play" },
  { from: "cd_playing", to: "cd_stopped", event: "STOP", action: "stop" },
  { from: "cd_loaded_group", to: "cd_stopped", event: "INIT", action: "stop" },
  {
    from: "cd_loaded_group", event: "NEXT_TRACK", guards: [
      { predicate: "is_last_track", to: "cd_stopped", action: "stop" },
      { predicate: "is_not_last_track", to: "history.cd_loaded_group", action: "go_next_track" }
    ]
  },
  {
    from: "cd_loaded_group", event: "PREVIOUS_TRACK", guards: [
      { predicate: "is_track_gt_1", to: "history.cd_loaded_group", action: "go_previous_track" },
      { predicate: "is_track_eq_1", to: "history.cd_loaded_group", action: "go_track_1" }
    ]
  },
  { from: "cd_loaded", to: "cd_drawer_open", event: "EJECT", action: "eject" },
  {
    from: "stepping_forwards", event: "TIMER_EXPIRED", guards: [
      { predicate: "is_not_end_of_cd", to: "stepping_forwards", action: "go_forward_1_s" },
      { predicate: "is_end_of_cd", to: "cd_stopped", action: "stop" }
    ]
  },
  { from: "stepping_forwards", to: "history.cd_loaded_group", event: "FORWARD_UP", action: "stop_forward_timer" },
  { from: "cd_loaded_group", to: "stepping_forwards", event: "FORWARD_DOWN", action: "go_forward_1_s" },
  { from: "stepping_backwards", to: "stepping_backwards", event: "TIMER_EXPIRED", action: "go_backward_1_s" },
  { from: "stepping_backwards", to: "history.cd_loaded_group", event: "REVERSE_UP", action: "stop_backward_timer" },
  { from: "cd_loaded_group", to: "stepping_backwards", event: "REVERSE_DOWN", action: "go_backward_1_s" }
];
