import ProvidersViewModel from "./ProvidersViewModel.js";
import wikipedia from "./wikipedia.js";

/**
 * @description View object to render.
 */
let view = {

  /**
   * @description map's center LatLng
   * @type {google.maps.LatLng}
   */
  center: new google.maps.LatLng(41.48, -81.67),

  /**
   * @description initialize for google map
   */
  init: function() {
    // when custom bind 'googlemap' was initialized,
    // this init method is called.
    this.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 10,
      center: this.center,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    this.infowindow = new google.maps.InfoWindow();
    this.autocomplete = new google.maps.places.Autocomplete(
      document.getElementById('location'), {
        types: ['establishment']
      }
    );

    // Style the markers a bit. This will be our listing marker icon.
    this.defaultIcon = this.makeMarkerIcon('FF0000');

    // Create a "highlighted location" marker color for when the user
    // mouses over the marker.
    this.highlightedIcon = this.makeMarkerIcon('FFFF24');

    // when infoWindow is open, the marker is blue.
    this.blueIcon = this.makeMarkerIcon('0000FF');

    // if a user searches a location by autocomplete,
    // move map's center to there and set observable location it.
    let self = this;
    this.autocomplete.addListener('place_changed', function() {
      let location = this.getPlace().geometry.location;
      providersViewModel.location(location);
      self.map.setCenter(location);
    });
  },

  /**
   * @description adjust map bounds and render it
   */
  render: function() {
    let filteredProviders = this.getProvidersViewModel().filteredProviders();

    // if providers' count is 0 and fit map to bounds,
    // map fits to unintented location. So check the count.

    if (filteredProviders.length == 0) {
      return;
    }
    let self = this;
    let bounds = new google.maps.LatLngBounds();
    filteredProviders.map(function(provider) {

      // expand map bounds to show all markers.
      bounds.extend(provider.marker.position);

      // add event to pop up infowindow when marker was clicked.
      provider.marker.addListener('click', function() {
        self.populateInfoWindow(provider);
      });
    });

    // fit google map to expanded bounds.
    this.map.fitBounds(bounds);
  },

  /**
   * @description set a google map's center location to a provider location.
   * @param {object} provider
   */
  centerize: function(provider) {
    let location = {
      lat: parseFloat(provider.point.lat),
      lng: parseFloat(provider.point.long)
    };
    this.map.setCenter(location);
  },

  /**
   * @description populate info window on a marker
   * @param {object} provider
   */
  populateInfoWindow: function(provider) {
    let marker = provider.marker;
    if (this.infowindow.marker != marker) {

      // When marker is already clicked and then
      // different marker is clicked without using closeclick event,
      // a former merker is still blue color means clicked.
      // So we have to reset the color.
      if (this.infowindow.marker != undefined) {
        this.infowindow.marker.setIcon(this.defaultIcon);
      }
      this.infowindow.marker = marker;
      this.infowindow.provider = provider;
      this.infowindow.marker.setIcon(this.blueIcon);

      // get a wikipedia image
      wikipedia.setImage(this.infowindow);
      this.infowindow.open(this.map, marker);
      // Make sure the marker property is cleared if the infowindow is closed.
      let self = this;
      this.infowindow.addListener('closeclick', function() {
        this.marker.setIcon(self.defaultIcon);
        this.setMarker = null;
      });
    }
  },

  /**
   * @description This function takes in a COLOR, and then creates a new marker
   * icon of that color. The icon will be 21 px wide by 34 high, have an origin
   * of 0, 0 and be anchored at 10, 34).
   * @param {string} markerColor
   * @return {google.maps.MarkerImage} marker's icon
   */
  makeMarkerIcon: function(markerColor) {
    let markerImage = new google.maps.MarkerImage(
      'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
      '|40|_|%E2%80%A2',
      new google.maps.Size(21, 34),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34),
      new google.maps.Size(21, 34)
    );
    return markerImage;
  },

  /**
   * @description Get ProvidersViewModel instance.
   * If not initialized, it's initialized.
   * @return {ProvidersViewModel} instance
   */
  getProvidersViewModel: function () {
    if (!this.providersViewModel) this.providersViewModel = new ProvidersViewModel();
    return this.providersViewModel;
  }
}

export default view;
