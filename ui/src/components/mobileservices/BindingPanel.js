import React, { Component } from 'react';
import { Wizard } from 'patternfly-react';
import { connect } from 'react-redux';
import Form from 'react-jsonschema-form';
import debounce from 'lodash/debounce';
import { createSecretName } from '../bindingUtils';
import { createBinding } from '../../actions/serviceBinding';
import '../configuration/ServiceSDKInfo.css';
import './ServiceRow.css';
import { OpenShiftObjectTemplate } from './bindingPanelUtils';

class BindingPanel extends Component {
  constructor(props) {
    super(props);

    this.onNextButtonClick = this.onNextButtonClick.bind(this);
    this.onBackButtonClick = this.onBackButtonClick.bind(this);
    this.renderPropertiesSchema = this.renderPropertiesSchema.bind(this);
    this.validate = this.validate.bind(this);
  }

  onNextButtonClick() {
    const { activeStepIndex } = this.state;
    if (activeStepIndex === 1) {
      this.form.submit();
      return false; // swallow the event, see validate function
    }
    this.setState({
      activeStepIndex: (activeStepIndex + 1) % 3
    });
    return true;
  }

  onBackButtonClick() {
    const { activeStepIndex } = this.state;
    this.setState({
      activeStepIndex: (activeStepIndex - 1) % 3
    });
  }

  show() {
    this.stepChanged(0);
    this.open();
  }

  componentWillMount() {
    const serviceName = this.props.service.getName();
    const schema = this.props.service.getBindingSchema();
    const form = this.props.service.getFormDefinition();
    const { service } = this.props;

    this.setState({
      serviceName,
      schema,
      form,
      loading: false,
      service,
      activeStepIndex: 0
    });
  }

  renderPropertiesSchema() {
    return (
      <Form
        schema={this.state.schema}
        uiSchema={{ form: this.state.form }}
        ref={form => {
          this.form = form;
        }}
        validate={this.validate}
        showErrorList={false}
        ObjectFieldTemplate={OpenShiftObjectTemplate}
        onChange={debounce(e => (this.formData = e.formData), 150)} // eslint-disable-line no-return-assign
      >
        <div />
      </Form>
    );
  }

  renderWizardSteps() {
    return [
      {
        title: 'Binding',
        render: () => (
          <form className="ng-pristine ng-valid">
            <div className="form-group">
              <label>
                <h3>
                  Create a binding for <strong className="ng-binding">{this.state.serviceName}</strong>
                </h3>
              </label>
              <span className="help-block">
                Bindings create a secret containing the necessary information for an application to use this service.
              </span>
            </div>
          </form>
        )
      },
      {
        title: 'Parameters',
        render: () => this.renderPropertiesSchema()
      },
      {
        title: 'Results',
        render: () => <div>review the binding</div>
      }
    ];
  }

  stepChanged = step => {
    if (step === 2) {
      this.setState({ loading: true });
      const credentialSecretName = createSecretName(`${this.state.service.getServiceInstanceName()}-credentials-`);
      const parametersSecretName = createSecretName(`${this.state.service.getServiceInstanceName()}-bind-parameters-`);
      this.props.createBinding(
        this.props.appName,
        this.state.service.getServiceInstanceName(),
        credentialSecretName,
        parametersSecretName,
        this.state.service.getServiceClassExternalName(),
        this.formData
      );
    }
  };

  /**
   * see https://github.com/mozilla-services/react-jsonschema-form/tree/6cb26d17c0206b610b130729db930d5906d3fdd3#form-data-validation
   */
  validate = (formData, errors) => {
    let hasError = false;
    /* Very important facts : We only have 4 services right now and must manually validate the form data.  In Mobile core the angular form did a lot of this for free */
    for (const key in errors) {
      if (errors.hasOwnProperty(key)) {
        switch (key) {
          case 'CLIENT_ID':
          case 'CLIENT_TYPE':
            if (!formData[key]) {
              errors[key].addError(`${key} is a required field.`);
              hasError = true;
            }
            break;
          case 'googlekey':
          case 'projectNumber':
            if ((formData.googlekey || formData.projectNumber) && !(formData.googlekey && formData.projectNumber)) {
              errors[key].addError('FCM requires a Key field and Project Number.');
              hasError = true;
            }
            break;
          case 'cert':
            if ((formData.cert || formData.passphrase) && !(formData.cert && formData.passphrase)) {
              errors.iosIsProduction.addError('APNS requires a certificate and passphrase.');
              hasError = true;
            }
            break;
          case 'iosIsProduction':
            break;
          case 'passphrase':
            if (formData.passphrase && formData.cert) {
              const confirmPasswordFieldId = `${this.form.state.idSchema.passphrase.$id}2`;
              const confirmPasswordField = document.getElementById(confirmPasswordFieldId);
              const passwordConfirmation = confirmPasswordField.value;
              if (formData.passphrase !== passwordConfirmation) {
                errors.iosIsProduction.addError('Passphrase does not match.');
                hasError = true;
              }
            }
            break;
          default:
            break;
        }
      }
    }

    if (!hasError) {
      // Avdance to final screen if valid
      this.setState({
        activeStepIndex: 2
      });
      this.stepChanged(2);
    }

    return errors;
  };

  render() {
    return (
      <Wizard.Pattern
        onHide={this.props.close}
        onExited={this.props.close}
        show={this.props.showModal}
        title="Create mobile client"
        steps={this.renderWizardSteps()}
        loadingTitle="Creating mobile binding..."
        loadingMessage="This may take a while. You can close this wizard."
        loading={this.state.loading}
        onStepChanged={this.stepChanged}
        nextText={this.state.activeStepIndex === 1 ? 'Create' : 'Next'}
        onNext={this.onNextButtonClick}
        onBack={this.onBackButtonClick}
        activeStepIndex={this.state.activeStepIndex}
      />
    );
  }
}

const mapDispatchToProps = {
  createBinding
};

export default connect(
  null,
  mapDispatchToProps
)(BindingPanel);
