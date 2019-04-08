import ProvidersViewModel from "./ProvidersViewModel.js";

/**
 * @description HIV/AIDS Prevention & Service Provider's view model
 * @constructor
 */
let providersViewModel = new ProvidersViewModel();

/**
 * custom binding for google map
 */
ko.bindingHandlers.googlemap = {

  /**
   * @description when this bind binded to DOM, this method is invoked.
   */
  init: function(element, valueAccessor, allBindings, providersViewModel) {
    providersViewModel.init();
  },

  /**
   * @description when filter is updated, this method is invoked.
   */
  update: function(element, valueAccessor, allBindings, providersViewModel) {
    let value = valueAccessor();

    // Just to trigger this update method,
    // get these values. Not to use here.
    let filter = value.filter();
    let service = value.service();
    providersViewModel.update();
  }
};

ko.applyBindings(providersViewModel);

/**
* @description handling when google map authentication errors.
*/
function gm_authFailure() {
  let msg = 'Can not initialize google map.';
  alert(msg);
};
