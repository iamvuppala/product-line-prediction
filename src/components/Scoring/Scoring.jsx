/*
   Copyright 2017 IBM Corp.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import React, {Component, PropTypes} from 'react';
import ReactDOM from 'react-dom';
import Table from '../DeploymentsTable';
import PersonsList from '../PersonsList';
import ScoringResult from './Result.jsx';
import styles from './style.scss';

const modelInfo = require('../../../config/model.json');

const propTypes = {
  onAlert: PropTypes.func
};

class Scoring extends Component {
  constructor (props) {
    super(props);
    this.state = {
      deployments: []
    };

    //this.persons = modelInfo['model-input'];
    this.persons = {
      "id": "Alice",
      "data": [1009530860,"F",0,2,114368,3852862,5,700259,0.917808,335,2090.32,3,"TX","Bachelors degree",0,"false"]
    };
    this.scoringData = {
      "id": "",
      "value": ""
    };
    this.expectedSchema = modelInfo['model-schema'];
    this.handlePredicting = this.handlePredicting.bind(this);
    this.setScoringData = this.setScoringData.bind(this);
    this.setScoringHref = this.setScoringHref.bind(this);
    this.reset = this.reset.bind(this);
  }

  componentWillMount () {
    let ctx = this;
    this.serverRequest = $.get('/env/deployments', function (result) {
      // validate deployment's model schema
      result = result.map(d => {
        let matches = false;
        let schema = d.model.input_data_schema.fields;
        if (schema.length === ctx.expectedSchema.length) {
          matches = true;
          for (let i = 0; i < schema.length; i++) {
            if ((schema[i].type !== ctx.expectedSchema[i].type) || (schema[i].name !== ctx.expectedSchema[i].name)) {
              matches = false;
              break;
            }
          }
        }
        d.disabled = !matches;
        d.createdAt = new Date(d.createdAt).toLocaleString();
        return d;
      });
      ctx.setState({
        deployments: result
      });
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.log(errorThrown);
      let err = errorThrown;
      if (jqXHR.responseJSON) {
        err = jqXHR.responseJSON.errors;
      } else if (jqXHR.responseText) {
        err = jqXHR.responseText;
      }
      ctx._alert(err);
    });
  }

  _alert (message) {
    this.props.onAlert ? this.props.onAlert(message) : console.warn(message);
  }

  setMyScoringdata(id,data){
    console.log("My ID:"+id+"DATA:"+data);
    this.scoringData.id=id;
    this.scoringData.value=data;
  }

  setScoringData (id, data) {
    console.log("ID:"+id+"DATA:"+data);
    // if (this.state.scoringData && this.state.scoringData.id === id) {
    //   return;
    // }
    this.setState({

      scoringData: {id: id, value: data},
      scoringResult: null
    });
  }

  setScoringHref (id, data) {
    if (this.state.scoringHref && this.state.scoringHref.id === id) {
      return;
    }
    this.setState({
      scoringHref: {id: id, value: data},
      scoringResult: null
    });
  }

  reset () {
    this.setState({
      scoringResult: null,
      scoringHref: null,
      scoringData: null
    });
  }

  handlePredicting (e) {
    e.preventDefault();
    this.persons.data[2]=parseInt(document.getElementById('testAge').value);
    console.log(this.persons);
    console.log(this.persons.data[2]);
    this.setMyScoringdata(this.persons.id,this.persons.data);

    console.log("Scoring data"+JSON.stringify(this.scoringData.value));
    console.log("Scoring HREF"+JSON.stringify(this.scoringHref));
    if (this.state.scoringHref == null) {
      this._alert('Select a Deployment');
      return;
    }
    // if (this.state.scoringData == null) {
    //   this._alert('Select a Customer');
    //   return;
    // }

    var data = {
      scoringData: JSON.stringify(this.scoringData.value),
      scoringHref: this.state.scoringHref.value
    };
    this.score(data, (error, result) => {
      if (!error) {
        this.setState({
          scoringResult: result
        });
      } else {
        this._alert(error);
      }
    });
  }

  score (scoringData, callback) {
    $.post('/env/score/', scoringData, function (response) {
      if (response.errors) {
        callback(response.errors);
      }
      callback(null, response.score);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      let err = (jqXHR.responseJSON ? jqXHR.responseJSON.errors : 'Scoring service failure.');
      /* extract error */
      let e = [jqXHR];
      try {
        e = e[0].responseJSON.error;
      } catch (e) {
        // suppress
      }
      err += ((typeof e === 'undefined') ? 'Undefined error' : e);
      callback && callback(err);
    });
  }

componentWillUnmount () {
  this.serverRequest.abort();
}

  render () {
    let scoringResult = (this.state.scoringResult &&
      <ScoringResult
        id={this.scoringData.id}
        deployment={this.state.scoringHref.id}
        probability={this.state.scoringResult.probability.values}
        onClose={this.reset}
      />);
    return (
        <div>
          <div className={styles.group}>
            <h3>Select a Deployment</h3>
            <Table data={this.state.deployments} onChoose={this.setScoringHref} className="center" selected={this.state.scoringHref && this.state.scoringHref.id}/>
          </div>
          <div className={styles.group}>
            <div className="container">
              <div className="row" >
                <div className="col-md-4">
                  <div className={styles.labels}><label>AGE</label><input id="testAge" class=".input-lg" placeholder="Customer Age" size="40"></input></div>
                </div>
                <div className="col-md-4">
                  <div className={styles.labels}><label>SEX</label>
                    <select placeholder="Select an Option" class="form-control">
                      <option>M</option>
                      <option>F</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="row">
                  <div className="col-md-4">
                    <div className={styles.labels}><label>INCOME</label><input id="test" class=".input-lg" placeholder="Income" size="40"></input></div>
                  </div>
                  <div className="col-md-4">
                    <div className={styles.labels}><label>NEGATIVE TWEETS </label><input id="test" class=".input-lg" placeholder="negative Tweets" size="40"></input></div>
                  </div>
              </div>
            </div>

          </div>
          <div className={styles.group}>
            <div onClick={this.handlePredicting} className={styles.runButton + ' center'}>Generate Predictions</div>
          </div>
          <div className={styles.group}>
            {scoringResult}
          </div>
        </div>
    );
  }
}

Scoring.propTypes = propTypes;

module.exports = Scoring;
