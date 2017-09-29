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

    this.persons = modelInfo['model-input'];
    this.mypersons = {
      "id": "Customer",
      "data": [ "M",0,0,0,0,0,0,0.0,0,0.0,0,"TX","Bachelors degree" ]
    };
    this.myScoringData = {
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
    this.myScoringData.id=id;
    this.myScoringData.value=data;
  }

  setScoringData (id, data) {
    //if (this.state.scoringData && this.state.scoringData.id === id) {
    //   return;
    //}
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
    this.mypersons.data[0]="M"
    this.mypersons.data[1]=0;
    this.mypersons.data[3]=0;
    this.mypersons.data[4]=0;
    this.mypersons.data[10]=0;
    this.mypersons.data[11]="TX";
    document.getElementById('testAge').value = "";
    document.getElementById('testSex').value = "";
    document.getElementById('testInvest').value = ""; 
    document.getElementById('testIncome').value = "";
    document.getElementById('testTweets').value = ""; 
    document.getElementById('testState').value = ""; 
  }

  handlePredicting (e) {
    e.preventDefault();
    var testVar=false;
    if(document.getElementById('testAge').value) {
      this.mypersons.data[1]=parseInt(document.getElementById('testAge').value);
      testVar=true;
    }
    if(document.getElementById('testSex').value != "" ) {
      this.mypersons.data[0]=document.getElementById('testSex').value;
      testVar=true;
    }
    if(document.getElementById('testIncome').value) {
      this.mypersons.data[4]=parseInt(document.getElementById('testIncome').value);
      testVar=true;
    }
    if(document.getElementById('testTweets').value) {
      this.mypersons.data[10]=parseInt(document.getElementById('testTweets').value);
      testVar=true;
    }
    if(document.getElementById('testState').value != "" ) {
      this.mypersons.data[11]=document.getElementById('testState').value;
      testVar=true;
    }
    if(document.getElementById('testInvest').value) {
      this.mypersons.data[3]=parseInt(document.getElementById('testInvest').value);
      testVar=true;
    }

    if (testVar == false &&  this.state.scoringData == null) {
      this._alert('Select an Option or select a customer');
      return;
    }

    var tempScoringData = [];
    if (testVar == true) {
      this.setMyScoringdata(this.mypersons.id,this.mypersons.data);
      tempScoringData = JSON.stringify(this.myScoringData.value)
      this.setScoringData(this.myScoringData.id, tempScoringData)
    } else if (!(this.state.scoringData == null)) {
      tempScoringData = this.state.scoringData.value
    }
    
    console.log(tempScoringData)
    if (this.state.scoringHref == null) {
      this._alert('Select a Deployment');
      return;
    }
    // if (this.state.scoringData == null) {
    //   this._alert('Select a Customer');
    //   return;
    // }

    var data = {
      scoringData: tempScoringData,
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
        id={this.state.scoringData.id}
        deployment={this.state.scoringHref.id}
        probability={this.state.scoringResult.probability.values}
        onClose={this.reset}
      />);
    return (
        <div>
          <div className={styles.group}>
            <h3>Provide Customer Information</h3>
            <div className="form-control" style={{fontSize : '1em', paddingTop: '15px', paddingBottom: '15px'}}>
              <div className="row">
              <div />
                <div className="col-md-5">
                  <div className={styles.labels}>
                    <label>AGE : </label>
                    <input id="testAge" class=".input-lg" placeholder="Customer Age"></input>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className={styles.labels}>
                    <label>SEX : </label>
                    <select placeholder="Select an Option" id="testSex" class=".input-lg">
                      <option value="">Choose</option>
                      <option>M</option>
                      <option>F</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-5">
                    <div className={styles.labels}>
                      <label>INVESTMENT : </label>
                      <input id="testInvest" class=".input-lg" placeholder="Investment"></input>
                    </div>
                </div>
              </div>
              <div className="row">&nbsp;</div>
              <div className="row">
                  <div className="col-md-5">
                    <div className={styles.labels}><label>INCOME : </label>
                    <input id="testIncome" class=".input-lg" placeholder="Income"></input></div>
                  </div>
                  <div className="col-md-2">
                    <div className={styles.labels}><label>STATE : </label>
                      <select placeholder="Select an Option" id="testState" class=".input-lg">
                        <option value="">Choose</option>
                        <option>AK</option>
                        <option>AL</option>
                        <option>AR</option>
                        <option>AZ</option>
                        <option>CA</option>
                        <option>CO</option>
                        <option>CT</option>
                        <option>DC</option>
                        <option>DE</option>
                        <option>FL</option>
                        <option>GA</option>
                        <option>IA</option>
                        <option>ID</option>
                        <option>IL</option>
                        <option>IN</option>
                        <option>KS</option>
                        <option>KY</option>
                        <option>LA</option>
                        <option>MA</option>
                        <option>MD</option>
                        <option>ME</option>
                        <option>MI</option>
                        <option>MN</option>
                        <option>MO</option>
                        <option>MS</option>
                        <option>MT</option>
                        <option>NC</option>
                        <option>ND</option>
                        <option>NE</option>
                        <option>NH</option>
                        <option>NJ</option>
                        <option>NM</option>
                        <option>NV</option>
                        <option>NY</option>
                        <option>OH</option>
                        <option>OK</option>
                        <option>OR</option>
                        <option>PA</option>
                        <option>RI</option>
                        <option>SC</option>
                        <option>SD</option>
                        <option>TN</option>
                        <option>TX</option>
                        <option>UT</option>
                        <option>VA</option>
                        <option>VT</option>
                        <option>WA</option>
                        <option>WI</option>
                        <option>WV</option>
                        <option>WY</option>                        
                      </select>
                    </div>
                  </div>
                  <div className="col-md-5">
                    <div className={styles.labels}><label>NEGATIVE TWEETS : </label>
                    <input id="testTweets" class=".input-lg" placeholder="negative Tweets"></input></div>
                  </div>
              </div>
            </div>
          </div>
          <div className={styles.group}>
          <h3 style={{textAlign: 'center'}}>(Or) select a Customer</h3>
            <PersonsList persons={this.persons} onChoose={this.setScoringData} selected={this.state.scoringData && this.state.scoringData.id}/>
          </div> 
          <div className={styles.group}>
            <h3>Select a Deployment</h3>
            <Table data={this.state.deployments} onChoose={this.setScoringHref} className="center" selected={this.state.scoringHref && this.state.scoringHref.id}/>
          </div>
          <h3></h3>
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
