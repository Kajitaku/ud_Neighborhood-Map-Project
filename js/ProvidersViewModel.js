import view from './view.js';

/**
 * @description HIV/AIDS Prevention & Service Provider's view model
 * @constructor
 */
function ProvidersViewModel() {
  let self = this;

  /**
   * @description view object
   * @type {view}
   */
  self.view = view;

  /**
   * @description @description provider service type
   * @type {string}
   */
  self.service = ko.observable('');

  /**
   * @description filter text for providers
   * @type {string}
   */
  self.filter = ko.observable('');

  /**
   * @description location where search providers
   * @type {google.maps.LatLng}
   */
  self.location = ko.observable(self.view.center);

  /**
   * @description HIV/AIDS Prevention & Service Providers
   * @type {array}
   */
  self.providers = ko.observableArray([]);

  /**
   * @description filterd Service Provider
   * @type {array}
   */
  self.filteredProviders = ko.observableArray([]);

  /**
   * @description initialize method
   */
  self.init = function() {
    self.view.init();
  };

  /**
   * @description update filterd providers and set markers on map.
   */
  self.update = function() {
    self.setFilteredProviders();
    self.putMarkers();
    self.view.render();
  };

  /**
   * @description set filterd providers to observableArray
   */
  self.setFilteredProviders = function() {
    let service = self.service();
    let filter = self.filter();
    let providers = self.providers();

    if (filter != '') {
      providers = ko.utils.arrayFilter(
        providers,
        function(provider) {
          return provider.title.indexOf(filter) != -1;
        });
    }

    if (service != '') {
      providers = ko.utils.arrayFilter(
        providers,
        function(provider) {
          return provider.serviceType == service;
        });
    }
    self.filteredProviders(providers);
  };

  /**
   * @description focus on a provider's location on map
   * @param {object} provider
   */
  self.focus = function(provider) {
    self.view.centerize(provider);
    self.view.populateInfoWindow(provider);
  };

  /**
   * @description put filtered provider's markers on map
   */
  self.putMarkers = function() {
    // actually, set visible to filtered provider's markers
    // and set unvisible to the others.
    let providers = self.providers();
    let filteredProviders = self.filteredProviders();
    providers.map(function(provider, index) {
      if (filteredProviders.includes(provider)) {
        provider.marker.setVisible(true);
      } else {
        provider.marker.setVisible(false);
      }
    });
  };

  /**
   * @description get provider's marker
   * @param {object} provider
   * @return {google.maps.Marker}
   */
  self.getMarker = function(provider) {
    let marker = new google.maps.Marker({
      map: self.view.map,
      position: {
        // these lat and long are string
        // so converted to float.
        lat: parseFloat(provider.point.lat),
        lng: parseFloat(provider.point.long)
      },
      title: provider.title
    });

    marker.addListener('mouseover', function() {
      // if marker is blue of when infoWindow is open,
      // keep the color
      if (this.getIcon() && this.getIcon().url == self.view.blueIcon.url) {
        return;
      }
      this.setIcon(self.view.highlightedIcon);
    });

    marker.addListener('mouseout', function() {
      // if marker is blue of when infoWindow is open,
      // keep the color
      if (this.getIcon() && this.getIcon().url == self.view.blueIcon.url) {
        return;
      }
      this.setIcon(self.view.defaultIcon);
    });

    return marker;
  };

  /**
   * @description Get View instance.
   * If not initialized, it's initialized.
   * @return {View} instance
   */
  // self.getView = function () {
  //   if (!this.view) this.view = new View();
  //   return this.view;
  // }

  ko.computed(function() {
    // when location was changed by autocomplete,
    // observable providers is reloaded.

    let location = self.location();
    let data = {
      lat: location.lat(),
      long: location.lng()
    };

    $.ajax({
        type: 'get',
        url: 'https://locator.hiv.gov/data',
        dataType: 'jsonp',
        contentType: 'jsonp',
        data,
        cache: true
      })
      .then(
        function(res) {
          let providers = [];
          res.services.map(function(service) {
            service.providers.map(function(provider) {
              provider.marker = self.getMarker(provider);
              provider.serviceType = service.serviceType;
              providers.push(provider);
            });
          });
          self.providers(providers);
        },
        function(XMLHttpRequest, textStatus, errorThrown) {
          let msg = "Can not reach resource site.";
          if (XMLHttpRequest.status == 404) {
            msg += " Site not found.";
          }
          alert(msg);
        }
      );
  });
};
export default ProvidersViewModel;
