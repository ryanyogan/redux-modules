import createAction from './createAction';
import { defaults, forEach, map, snakeCase } from 'lodash';
import parsePayloadErrors from '../middleware/parsePayloadErrors';

const defaultReducer = state => state;

const applyReducerEnhancer = (reducer, enhancer) => {
  if (typeof enhancer === 'function') {
    return enhancer(reducer);
  }
  return reducer;
};

function formatType(actionName) {
  return snakeCase(actionName).toUpperCase();
}

function parseTransformation(transformation, actionName) {
  if (typeof actionName !== 'string' && typeof transformation.type !== 'string') {
    throw new Error('`type` must be a string if `transformations` is an array.');
  }
  const type = typeof actionName === 'string' ? formatType(actionName) : transformation.type;
  if (typeof transformation === 'function') {
    return { actionName, reducer: transformation, type };
  }
  return defaults({}, transformation, { actionName, type });
}

export default function createModule({
  composes = [],
  initialState,
  middleware: moduleMiddleware = [],
  name,
  reducerEnhancer,
  selector,
  transformations,
}) {
  const parsedTransformations = map(transformations, parseTransformation);
  const actions = {};
  const constants = {};
  const reducerMap = {};
  forEach(parsedTransformations,
    ({ actionName, middleware = [], namespaced = true, reducer, type }) => {
      const finalMiddleware = [parsePayloadErrors, ...middleware, ...moduleMiddleware];
      const constant = namespaced ? `${name}/${type}` : type;
      actions[actionName] = createAction(constant, finalMiddleware);
      constants[actionName] = constant;
      reducerMap[constant] = reducer;
    });
  function finalReducer(state = initialState, action) {
    const localReducer = reducerMap[action.type] || defaultReducer;
    return [localReducer, ...composes]
      .reduce((newState, currentReducer) => currentReducer(newState, action), state);
  }
  return {
    actions,
    constants,
    name,
    reducer: applyReducerEnhancer(finalReducer, reducerEnhancer),
    selector,
  };
}
