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
import cytoscape from 'cytoscape';
// import dagre from 'cytoscape-dagre';
import klay from 'cytoscape-klay';

// cytoscape.use( dagre );
cytoscape.use( klay );

const INIT = "init";
const HISTORY = 'history';
const TO_SELF = 'to_self';
const STANDARD = 'standard';
const INITIAL_STATE_NAME = 'nok';

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
    "states": ["${INITIAL_STATE_NAME}", [
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
      { "from": "${INITIAL_STATE_NAME}", "to": "no_cd_loaded", "event": "${INIT}", "action": "fsm_initialize_model" },
      { "from": "no_cd_loaded", "to": "cd_drawer_closed", "event": "${INIT}", "action": "identity" },
      { "from": "cd_drawer_closed", "to": "cd_drawer_open", "event": "EJECT", "action": "open_drawer" },
      { "from": "cd_drawer_open", "to": "closing_cd_drawer", "event": "EJECT", "action": "close_drawer" },
      {
        "from": "closing_cd_drawer", "guards": [
          { "predicate": "is_not_cd_in_drawer", "to": "cd_drawer_closed", "action": "identity" },
          { "predicate": "is_cd_in_drawer", "to": "cd_loaded", "action": "identity" }
        ]
      },
      { "from": "cd_loaded", "to": "cd_loaded_group", "event": "${INIT}", "action": "identity" },
      { "from": "cd_playing", "to": "cd_paused_group", "event": "PAUSE", "action": "pause_playing_cd" },
      { "from": "cd_paused_group", "to": "cd_playing", "event": "PAUSE", "action": "resume_paused_cd" },
      { "from": "cd_paused_group", "to": "cd_playing", "event": "PLAY", "action": "resume_paused_cd" },
      { "from": "cd_paused_group", "to": "time_and_track_fields_not_blank", "event": "${INIT}", "action": "identity" },
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
      { "from": "cd_loaded_group", "to": "cd_stopped", "event": "${INIT}", "action": "stop" },
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
  const firstNode = [{ data: { id: `${INITIAL_STATE_NAME}.${INIT}`, label: INIT, parent: undefined } }];
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
      // { from: "cd_loaded", to: "cd_loaded_group", event: "${INIT}", action: "identity" },
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

  var options = {
    name: 'klay',
    nodeDimensionsIncludeLabels: false, // Boolean which changes whether label dimensions are included when calculating node dimensions
    fit: true, // Whether to fit
    padding: 20, // Padding on fit
    animate: false, // Whether to transition the node positions
    animateFilter: function( node, i ){ return true; }, // Whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
    animationDuration: 500, // Duration of animation in ms if enabled
    animationEasing: undefined, // Easing of animation if enabled
    transform: function( node, pos ){ return pos; }, // A function that applies a transform to the final node position
    ready: undefined, // Callback on layoutready
    stop: undefined, // Callback on layoutstop
    klay: {
      // Following descriptions taken from http://layout.rtsys.informatik.uni-kiel.de:9444/Providedlayout.html?algorithm=de.cau.cs.kieler.klay.layered
      addUnnecessaryBendpoints: false, // Adds bend points even if an edge does not change direction.
      aspectRatio: 1.6, // The aimed aspect ratio of the drawing, that is the quotient of width by height
      borderSpacing: 20, // Minimal amount of space to be left to the border
      compactComponents: false, // Tries to further compact components (disconnected sub-graphs).
      crossingMinimization: 'LAYER_SWEEP', // Strategy for crossing minimization.
      /* LAYER_SWEEP The layer sweep algorithm iterates multiple times over the layers, trying to find node orderings that minimize the number of crossings. The algorithm uses randomization to increase the odds of finding a good result. To improve its results, consider increasing the Thoroughness option, which influences the number of iterations done. The Randomization seed also influences results.
      INTERACTIVE Orders the nodes of each layer by comparing their positions before the layout algorithm was started. The idea is that the relative order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive layer sweep algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
      cycleBreaking: 'GREEDY', // Strategy for cycle breaking. Cycle breaking looks for cycles in the graph and determines which edges to reverse to break the cycles. Reversed edges will end up pointing to the opposite direction of regular edges (that is, reversed edges will point left if edges usually point right).
      /* GREEDY This algorithm reverses edges greedily. The algorithm tries to avoid edges that have the Priority property set.
      INTERACTIVE The interactive algorithm tries to reverse edges that already pointed leftwards in the input graph. This requires node and port coordinates to have been set to sensible values.*/
      direction: 'UNDEFINED', // Overall direction of edges: horizontal (right / left) or vertical (down / up)
      /* UNDEFINED, RIGHT, LEFT, DOWN, UP */
      edgeRouting: 'ORTHOGONAL', // Defines how edges are routed (POLYLINE, ORTHOGONAL, SPLINES)
      edgeSpacingFactor: 0.5, // Factor by which the object spacing is multiplied to arrive at the minimal spacing between edges.
      feedbackEdges: false, // Whether feedback edges should be highlighted by routing around the nodes.
      fixedAlignment: 'NONE', // Tells the BK node placer to use a certain alignment instead of taking the optimal result.  This option should usually be left alone.
      /* NONE Chooses the smallest layout from the four possible candidates.
      LEFTUP Chooses the left-up candidate from the four possible candidates.
      RIGHTUP Chooses the right-up candidate from the four possible candidates.
      LEFTDOWN Chooses the left-down candidate from the four possible candidates.
      RIGHTDOWN Chooses the right-down candidate from the four possible candidates.
      BALANCED Creates a balanced layout from the four possible candidates. */
      inLayerSpacingFactor: 1.0, // Factor by which the usual spacing is multiplied to determine the in-layer spacing between objects.
      layoutHierarchy: false, // Whether the selected layouter should consider the full hierarchy
      linearSegmentsDeflectionDampening: 0.3, // Dampens the movement of nodes to keep the diagram from getting too large.
      mergeEdges: false, // Edges that have no ports are merged so they touch the connected nodes at the same points.
      mergeHierarchyCrossingEdges: true, // If hierarchical layout is active, hierarchy-crossing edges use as few hierarchical ports as possible.
      nodeLayering:'NETWORK_SIMPLEX', // Strategy for node layering.
      /* NETWORK_SIMPLEX This algorithm tries to minimize the length of edges. This is the most computationally intensive algorithm. The number of iterations after which it aborts if it hasn't found a result yet can be set with the Maximal Iterations option.
      LONGEST_PATH A very simple algorithm that distributes nodes along their longest path to a sink node.
      INTERACTIVE Distributes the nodes into layers by comparing their positions before the layout algorithm was started. The idea is that the relative horizontal order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive node layering algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
      nodePlacement:'BRANDES_KOEPF', // Strategy for Node Placement
      /* BRANDES_KOEPF Minimizes the number of edge bends at the expense of diagram size: diagrams drawn with this algorithm are usually higher than diagrams drawn with other algorithms.
      LINEAR_SEGMENTS Computes a balanced placement.
      INTERACTIVE Tries to keep the preset y coordinates of nodes from the original layout. For dummy nodes, a guess is made to infer their coordinates. Requires the other interactive phase implementations to have run as well.
      SIMPLE Minimizes the area at the expense of... well, pretty much everything else. */
      randomizationSeed: 1, // Seed used for pseudo-random number generators to control the layout algorithm; 0 means a new seed is generated
      routeSelfLoopInside: false, // Whether a self-loop is routed around or inside its node.
      separateConnectedComponents: true, // Whether each connected component should be processed separately
      spacing: 20, // Overall setting for the minimal amount of space to be left between objects
      thoroughness: 7 // How much effort should be spent to produce a nice layout..
    },
    priority: function( edge ){ return null; }, // Edges with a non-nil value are skipped when geedy edge cycle breaking is enabled
  };
  const data = {
    container: document.getElementById('cy'),
    boxSelectionEnabled: true,
    autounselectify: true,
    style,
    elements: nodes.concat(edges),
  } ;
  console.log(data);
  cytoscape(data).layout( options).run() ;

  // cytoscape.layout( options) ;

  // cytoscape({
  //   container: document.getElementById('cy'),
  //   boxSelectionEnabled: true,
  //   autounselectify: true,
  //   style,
  //   elements: nodes.concat(edges),
  //
  //   layout: {
  //     name: 'klay',
  //     randomize: false,
  //     idealEdgeLength: 70,
  //     animate: false,
  //     nodeDimensionsIncludeLabels: true
  //   }
  // });

}
