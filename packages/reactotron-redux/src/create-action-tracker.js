import { contains, is, concat, merge } from 'ramda'
import { DEFAULT_REPLACER_TYPE } from './replacement-reducer'

const DEFAULTS = {
  // except: [] // which actions
}

// create the store enhancer
export default (reactotron, trackerOptions = {}) => {
  // verify reactotron is sane
  if (!(is(Object, reactotron) && typeof reactotron.use === 'function')) {
    throw new Error('invalid reactotron passed')
  }

  // assemble a crack team of options to use
  const options = merge(DEFAULTS, trackerOptions)
  const exceptions = concat([DEFAULT_REPLACER_TYPE], options.except || [])
  const exceptionPatterns = options.exceptionPatterns || [];

  // the store enhancer
  return next => (reducer, initialState, enhancer) => {
    // create the original store
    const store = next(reducer, initialState, enhancer)

    // return a new store
    return {
      // featuring the properties of the original store
      ...store,

      // and a brand new dispatch function that wraps the old dispatch
      dispatch: action => {
        // start a timer
        const elapsed = reactotron.startTimer()

        // call the original dispatch that actually does the real work
        const result = store.dispatch(action)

        // stop the timer
        const ms = elapsed()

        var unwrappedAction = action.type === 'PERFORM_ACTION' && action.action ? action.action : action

        const exceptionPattern = exceptionPatterns.reduce((prev, pattern) => pattern(unwrappedAction.type) || prev, false);

        // action not blacklisted?
        if (!exceptionPattern && !contains(unwrappedAction.type, exceptions)) {
          // check if the app considers this important
          let important = false
          if (trackerOptions && typeof trackerOptions.isActionImportant === 'function') {
            important = !!trackerOptions.isActionImportant(unwrappedAction)
          }

          reactotron.reportReduxAction(unwrappedAction, ms, important)
        }

        return result
      }
    }
  }
}
