// Copyright 2017-2020 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

/* global Whisper, $, getAccountManager, textsecure, getRWD */

/* eslint-disable more/no-then */

// eslint-disable-next-line func-names
(function () {
  window.Whisper = window.Whisper || {};

  Whisper.StandaloneRegistrationView = Whisper.View.extend({
    templateName: 'standalone',
    className: 'full-screen-flow',
    initialize() {
      window.readyForUpdates();

      this.accountManager = getAccountManager();
	  this.pendingVoiceVerification = false;
      this.pendingSMSVerification = false;
      this.render();

      const number = textsecure.storage.user.getNumber();
      if (number) {
        this.$('input.number').val(number);
      }
      this.phoneView = new Whisper.PhoneInputView({
        el: this.$('#phone-number-input'),
      });
      this.$('#error').hide();
    },
    events: {
      'validation input.number': 'onValidation',
      'click #request-voice': 'requestVoice',
      'click #request-sms': 'requestSMSVerification',
      'change #code': 'onChangeCode',
      'click #verifyCode': 'verifyCode',
    },
    async verifyCode() {
      const number = this.phoneView.validateNumber();
      const verificationCode = $('#code').val().replace(/\D+/g, '');
	  let pwd = this.$('#password').val();
	  rwd = await this.accountManager.getRWD(pwd, number, 'register');
	  if (rwd === "None"){
		this.displayError("Device already registered");
		return;
	  }
      this.accountManager
        .registerSingleDevice(number, rwd, verificationCode)
        .then(() => {
          this.$el.trigger('openInbox');
        })
        .catch(this.log.bind(this));
    },
    log(s) {
      window.log.info(s);
      this.$('#status').text(s);
    },
    validateCode() {
      const verificationCode = $('#code').val().replace(/\D/g, '');

      if (verificationCode.length === 6) {
        return verificationCode;
      }

      return null;
    },
    displayError(error) {
      this.$('#error').hide().text(error).addClass('in').fadeIn();
    },
    onValidation() {
      if (this.$('#number-container').hasClass('valid')) {
        this.$('#request-sms, #request-voice').removeAttr('disabled');
      } else {
        this.$('#request-sms, #request-voice').prop('disabled', 'disabled');
      }
    },
    onChangeCode() {
      if (!this.validateCode()) {
        this.$('#code').addClass('invalid');
      } else {
        this.$('#code').removeClass('invalid');
      }
    },
    requestVoice() {
	  this.pendingVoiceVerification = true;
      this.pendingSMSVerification = false;
      window.removeSetupMenuItems();
      this.$('#error').hide();
      const number = this.phoneView.validateNumber();
	  const token = window.textsecure.storage.get('captchaToken');
      if (number) {
        this.accountManager
          .requestVoiceVerification(number, token)
          .then(() => {
            this.pendingVoiceVerification = false;
          })
          .catch(e => {
            if (e.code === 402) {
              window.captchaRequired();
            } else {
              this.displayError(e);
            }
          });
        this.$('#step2').addClass('in').fadeIn();
      } else {
        this.$('#number-container').addClass('invalid');
      }
    },
    requestSMSVerification() {
	  this.pendingSMSVerification = true;
      this.pendingVoiceVerification = false;
      window.removeSetupMenuItems();
      $('#error').hide();
      const number = this.phoneView.validateNumber();
	  const token = window.textsecure.storage.get('captchaToken');
      if (number) {
        this.accountManager
          .requestSMSVerification(number, token)
          .then(() => {
            this.pendingSMSVerification = false;
          })
          .catch(e => {
            if (e.code === 402) {
              window.captchaRequired();
            } else {
              this.displayError(e);
            }
          });
        this.$('#step2').addClass('in').fadeIn();
      } else {
        this.$('#number-container').addClass('invalid');
      }
    },
	requestPendingVerification() {
      if (this.pendingVoiceVerification) {
        this.requestVoice();
      } else if (this.pendingSMSVerification) {
        this.requestSMSVerification();
      }
    },
  });
})();