// TODO : add {states, transitions} format to specs for automata library
// TODO : 1. conversion format to plant text (have a look how it ends up looking like with the cd player)
// TODO : conversion format to gml -> yed : NO, ugly
// gml :
// Creator	"yFiles"
// Version	"2.14"
// graph
//   [
//   hierarchic	1
// label	""
// directed	1
// node
//   [
//   id	9
// label	"ControlState"
// gid	8
// ]
// ...
// edge
//   [
//   source	2
// target	0
// label	"Fetch result [ step Teams] / Display screen"
// ]
// TODO :respect indentation...
// for yed, I will have to do something to indicate H states (not really), but INIT state for sure (for now just put
// I)

import { arrayTreeLenses, breadthFirstTraverseTree } from "fp-rosetree"
import dagre from 'cytoscape-dagre';

const INIT = "INIT";
const HISTORY = 'history';
const TO_SELF = 'to_self';
const STANDARD = 'standard';
const style = `
        node[label = '${INIT}'] {
          background-color: black;
          height: 5px;
          width: 5px;
        }
        node[label != '${INIT}'] {
          content: data(label);
          text-valign: center;
          text-halign: center;
          shape: roundrectangle;
          width: label;
          height: label;
          padding-left: 5px;
          padding-right: 5px;
          padding-top: 5px;
          padding-bottom: 5px;
          background-color: white;
          border-width: 1px;
          border-color: black;
          font-size: 10px;
          font-family: Helvetica Neue;
        }
        node:active {
          overlay-color: black;
          overlay-padding: 0;
          overlay-opacity: 0.1;
        }
        $node > node {
          padding-top: 1px;
          padding-left: 10px;
          padding-bottom: 10px;
          padding-right: 10px;
          text-valign: top;
          text-halign: center;
          border-width: 1px;
          border-color: black;
          background-color: white;
        }
        edge {
          width: 1px;
          target-arrow-shape: triangle;
          label: data(label);
          font-size: 5px;
          font-weight: bold;
          text-background-color: #fff;
          text-background-padding: 3px;
          line-color: black;
          target-arrow-color: black;
          z-index: 100;
          text-wrap: wrap;
          text-background-color: white;
          text-background-opacity: 1;
          target-distance-from-node: 1px;
        }
        edge[type = '${TO_SELF}'] {
          curve-style: bezier;
          loop-direction: -20deg;
          loop-sweep: -70deg;
        }
        edge[type = '${STANDARD}'] {
          curve-style: bezier;
          width: 1px;
          target-distance-from-node: 5px;
        }
        edge[type = '${HISTORY}'] {
          curve-style: bezier;
          
        }
        edge[type = '${INIT}'] {
          curve-style: segments;
          edge-distances: node-position;
          segment-weights: 0.15 0.85;
        }
      `;
let graphSpecs;

window.onload = function () {
  const generateGraphSel = document.querySelector('#visualize');
  const textAreaSel = document.querySelector('textarea');
  graphSpecs = `
  {
    states: ['root', [
      ['no_cd_loaded', [
        "cd_drawer_closed",
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
    ]],
    transitions: [
      { from: "NOK", to: "no_cd_loaded", event: "INIT", action: "fsm_initialize_model" },
      { from: "no_cd_loaded", to: "cd_drawer_closed", event: "INIT", action: "identity" },
      { from: "cd_drawer_closed", to: "cd_drawer_open", event: "EJECT", action: "open_drawer" },
      { from: "cd_drawer_open", to: "closing_cd_drawer", event: "EJECT", action: "close_drawer" },
      {
        from: "closing_cd_drawer", guards: [
          { predicate: "is_not_cd_in_drawer", to: "cd_drawer_closed", action: "identity" },
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
    ]
  }
`;
// listeners
  textAreaSel.value = graphSpecs;
  textAreaSel.addEventListener('change', graphChangeHandler, false);
  generateGraphSel.addEventListener('click', generateGraphHandler, false);
};

function graphChangeHandler(ev) {
  graphSpecs = ev.target.value;
}

function generateGraphHandler(ev) {
  // Get all nodes declared in the states property of the graph specification
  // We need a unique id for the node, as per cytoscape contract
  // `label` will be displayed in the node rectangle area
  // `parent` serves to identify compound groups
  const { states, transitions } = eval(`var g=${graphSpecs};g`);
  const { getLabel, getChildren } = arrayTreeLenses;
  const traverse = {
    seed: [],
    visit: (result, traversalState, tree) => {
      const parentLabel = getLabel(tree);
      const children = getChildren(tree);
      const graphNodes = children.map(child => {
        return {
          data: {
            id: getLabel(child),
            label: getLabel(child),
            parent: parentLabel
          }
        }
      });

      return result.concat(graphNodes)
    }
  }

  // Per our state transducer specs, all automata start in an initial NOK state, so we create that first
  const firstNode = [{ data: { id: `NOK.${INIT}`, label: INIT, parent: undefined } }];
  // Then we add the rest of the nodes passed in the graph specification
  const nodes = firstNode.concat(breadthFirstTraverseTree(arrayTreeLenses, traverse, states));
  // We display it in the console for now in case we want to export it to another visualizer or format (yed...)
  console.debug(`nodes`, JSON.stringify(nodes));

  // Next, we traverse the `transitions` rows to get the list of edges to display
  const edgesList = transitions.map(transition => {
    const { guards, from, to, event, action } = transition;
    // If we have an array of guards in a row, we unwrap that array into a regular array of transition
    const transitions = guards
      ? guards.map(({ predicate, to, action }) => ({ from, to, event, action, guard: predicate }))
      : [{ from, to, event, action, guard: null }];

    // Then we get all the edges from that array of transitions for that row
    const edgeList = transitions.map(transition => {
      const { from, to, event, action, guard } = transition;
      const actionStr = action ? `/ ${action}` : '';
      const guardStr = guard ? `[ ${guard} ]` : '';
      const eventStr = event ? `${event}` : '';
      let edge;

      // Case init transition (event is INIT)
      // { from: "cd_loaded", to: "cd_loaded_group", event: "INIT", action: "identity" },
      if (event === INIT) {
        const initEvent = [from, event].join('.');
        nodes.push({ data: { id: `${initEvent}`, label: INIT, parent: from } });

        edge = {
          data: {
            id: `${initEvent} - ${to} : ${guard ? guard : 'T'}? ${actionStr}`,
            source: initEvent,
            target: to,
            type: INIT,
            label: ""
          }
        }
      }
      else if (to.startsWith(HISTORY)) {
        // Case history transition
        // { from: "stepping_backwards", to: "history.cd_loaded_group", event: "REVERSE_UP", action:
        // "stop_backward_timer" },
        nodes.push({ data: { id: [HISTORY, from, to.split('.')[1]].join('.'), label: 'H', parent: to.split('.')[1] } });

        // NOTE : exact same as normal condition
        edge = {
          data: {
            id: `${from} - ${to} : ${guard ? guard : 'T'}? ${actionStr}`,
            source: from,
            target: [HISTORY, from, to.split('.')[1]].join('.'),
            type: HISTORY,
            label: [eventStr, guardStr, actionStr].join(' ')
          }
        }
      }
      else {
        // Case normal transition
        edge = {
          data: {
            id: `${from} - ${to} : ${guard ? guard : 'T'}? ${actionStr}`,
            source: from,
            target: to,
            type: from === to ? TO_SELF : STANDARD,
            label: [eventStr, guardStr, actionStr].join(' ')
          }
        }
      }

      return edge
    });

    return edgeList;
  });
  const edges = [].concat(...edgesList);
  console.debug(`edges`, JSON.stringify(edges));

  cytoscape({
    container: document.getElementById('cy'),
    boxSelectionEnabled: true,
    autounselectify: true,
    style,
    elements: nodes.concat(edges),

    layout: {
      name: 'dagre',
      randomize: false,
      idealEdgeLength: 70,
      animate: false,
      nodeDimensionsIncludeLabels: true
    }
  });

}
