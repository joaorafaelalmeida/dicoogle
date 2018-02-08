
import React, {PropTypes} from 'react';
import Autosuggest from 'react-autosuggest';
import {ActionCreators} from '../../actions/searchActions';
import {ProvidersStore} from '../../stores/providersStore';
import {ProvidersActions} from '../../actions/providersActions';
import {AdvancedSearch} from '../search/advancedSearch';
import {SearchResult} from '../search/searchResult';
import {DimFields} from '../../constants/dimFields';
import {getUrlVars} from '../../utils/url';
import {SearchStore} from '../../stores/searchStore';

const Search = React.createClass({
    propTypes: {
      params: PropTypes.object.isRequired,
      location: PropTypes.object.isRequired
    },

    getInitialState: function (){
        this.keyHash = getUrlVars()['_k'];
        let fields = DimFields.map(field => ({value: field, label: field}));
        return {
          label: 'login',
          searchState: "simple",
          providers: [],
          selectedProviders: [],
          queryText: '',
          querySuggestions: [],
          fields: fields,
          requestedQuery: null,
          error: null,
          data: null
        };
    },

    componentWillMount: function(){
      ProvidersStore.listen(this._onProvidersChange);
      SearchStore.listen(this._onSearchResult);
    },

    componentDidMount: function(){
      if(getUrlVars()['query']) {
        this.onSearchByUrl();
      }
      ProvidersActions.get();
    },
    componentWillUnmount: function(){
    },
    componentWillUpdate: function() {

        if (getUrlVars()['_k'] !== this.keyHash)
        {
            this.keyHash = getUrlVars()['_k'];
            this.setState({
                requestedQuery: null
            });
        }
        this.keyHash = getUrlVars()['_k'];
    },
    componentDidUpdate: function(){
      
    },

    onReturn(error) {
      this.setState({
        requestedQuery: null,
        error
      });
    },

    getSearchOutcome() {
      const {data, error} = this.state;
      return data ? { data, error } : null;
    },

    render: function() {

      let providersList = this.state.providers.map(
          (item, index) => (<option key={item} value={item}>
                              {item}
                            </option>));
      providersList.unshift(<option key="__all__" value="__all__">All Providers</option>);

      const currProvider = this.state.selectedProviders[0];
      let selectionButtons = (
          <div>
          <button type="button" className="btn btn_dicoogle" onClick={this.renderFilter} data-trigger="advance-search" id="btn-advance">
            {this.state.searchState === "simple" ? "Advanced" : "Basic"}
          </button>
              <div className="btn-group">
                  <select id="providersList" className="btn btn_dicoogle form-control"
                          value={currProvider}
                          onChange={this.handleProviderSelect}>
                    {providersList}
                  </select>
              </div>
              </div>
        );

      let simpleSearchInstance = (
        <div className="row space_up" id="main-search">
          <form onSubmit={this.onSearchClicked}>
            <div className="col-xs-8 col-sm-10">
              <Autosuggest
                suggestions={this.state.querySuggestions}
                onSuggestionSelected={this.onSuggestionSelected}
                onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
                onSuggestionsClearRequested={this.onSuggestionsClearRequested}
                getSuggestionValue={(suggestion) => (suggestion)}
                renderSuggestion={(suggestion) => (<span>{suggestion}</span>)}
                inputProps={{
                  placeholder: "Free text or advanced query",
                  value: this.state.queryText,
                  onChange: this.onQueryChange,
                  onKeyDown: this.onKeyDown
                }} />
            </div>
            <div className="col-xs-4 col-sm-2">
              <button type="button" className="btn btn_dicoogle" id="search-btn"
                      onClick={this.onSearchClicked}> <i className="fa fa-search"/> &nbsp; Search</button>
            </div>
          </form>
        </div>
      );

       // if there are already results, we need to add a new component 
       let resultComponent = false;
       
       if (this.state.requestedQuery !== null && !this.state.error) {

         resultComponent = (<SearchResult requestedQuery={this.state.requestedQuery}
                              searchOutcome={this.getSearchOutcome()}
                              onReturn={this.onReturn} />);
       }
       if(this.state.searchState === "simple") {
            return (<div>
              {selectionButtons}
              {simpleSearchInstance}
              {resultComponent}
              <div className="result-error">{this.state.error}</div>
            </div>);
       } else if(this.state.searchState === "advanced") {
            return (<div>
              {selectionButtons}
              <AdvancedSearch/>
              {resultComponent}
              <div className="result-error">{this.state.error}</div>
            </div>);
       }
    },

    onSuggestionsFetchRequested: function(value) {
      // get the last term for the query
      let lastTerm = value.value.split(" AND ").pop().trim().toLowerCase();
      let suggestions = DimFields.filter(field => (field.toLowerCase().substr(0, lastTerm.length) === lastTerm));

      this.setState({
        querySuggestions: suggestions
      });
    },

    onSuggestionsClearRequested: function() {
      this.setState({
        querySuggestions: []
      });
    },
  
    onSuggestionSelected: function (event, {method}) {
      // prevent search when selecting a suggestion
      if (method === 'enter') {
        event.preventDefault();
      }
    },

    onQueryChange: function(event, { newValue, method }) {
      let queryText;

      if (method === 'type') {
        queryText = newValue;
      } else if (method === 'escape') {
        queryText = this.state.queryText;
      } else {
        // get the last term (that will be the new term) and the remaining query
        let newTerm = newValue.split(" AND ").pop().trim() + ':';
        let prefix = this.state.queryText.match(/(.*) AND/);
        queryText = prefix ? prefix[0] + ' ' + newTerm : newTerm;
      }

      this.setState({
        queryText: queryText
      });
    },

    _onProvidersChange: function(data) {
        if (this.isMounted())
        this.setState({providers: data.data});
    },
    _onSearchResult: function(outcome) {
      if (this.isMounted())
      {
        console.log('outcome:', outcome);

        let error = null;
        if (!outcome.success) {
          error = "An error occurred. Please contact your system administrator.";
        } else if (outcome.data.numResults === 0) {
          error = "No studies were found for that search.";
        }
        this.setState({
          data: outcome.data,
          status: "stopped",
          success: outcome.success,
          requestedQuery: error ? null : this.state.requestedQuery,
          error
        });
      }
    },
    renderFilter: function(){
      var switchState;
      if(this.state.searchState === "simple"){
        switchState = "advanced";
      } else {
        switchState = "simple";
      }
      this.setState({searchState: switchState})
    },
    onSearchByUrl: function(){
      let params = {text: getUrlVars()['query'], keyword: getUrlVars()['keyword'], provider: getUrlVars()['provider']};
      if (params.provider === 'all') {
        params.provider = undefined;
      }
      this.setState({
        requestedQuery: params
      });
    },
    handleProviderSelect(e) {
      const name = e.target.value;
      this.setState({
        selectedProviders: name === '__all__' ? [] : [name]
      });
    },
    onSearchClicked: function() {
        const text = this.state.queryText;
        const provider = this.state.selectedProviders;
        const params = {text, keyword: this.isKeyword(text), other: true, provider};
        this.triggerSearch(params);
    },
    triggerSearch: function(params){
        this.setState({
          requestedQuery: params,
          data: null,
          error: null
        });
      ActionCreators.search(params);
    },
    isKeyword: function(freetext) {
      return !!freetext.match(/[^\s\\]:\S/);
    }
});

export {Search};

window.action = ActionCreators;
