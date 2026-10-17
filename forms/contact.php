<?php
  /**
  * Flywheel Hospitality - Partner With Us enquiry form handler
  * Requires the "PHP Email Form" library (BootstrapMade pro version):
  * upload it to assets/vendor/php-email-form/php-email-form.php
  * Or replace this file with your own handler (CRM / Google Sheet / email service).
  */

  $receiving_email_address = 'flywheelhospitality@gmail.com';

  if( file_exists($php_email_form = '../assets/vendor/php-email-form/php-email-form.php' )) {
    include( $php_email_form );
  } else {
    die( 'Unable to load the "PHP Email Form" Library!');
  }

  $contact = new PHP_Email_Form;
  $contact->ajax = true;

  $contact->to = $receiving_email_address;
  $contact->from_name = $_POST['name'];
  $contact->from_email = !empty($_POST['email']) ? $_POST['email'] : $receiving_email_address;
  $contact->subject = 'New hotel owner enquiry: ' . $_POST['property_name'];

  $contact->add_message( $_POST['name'], 'Name');
  $contact->add_message( $_POST['mobile'], 'Mobile / WhatsApp');
  $contact->add_message( $_POST['email'], 'Email');
  $contact->add_message( $_POST['property_name'], 'Property Name');
  $contact->add_message( $_POST['location'], 'Location');
  $contact->add_message( $_POST['rooms'], 'Number of Rooms');
  $contact->add_message( $_POST['occupancy'], 'Current Occupancy');
  $contact->add_message( $_POST['challenge'], 'Current Challenge');
  $contact->add_message( $_POST['message'], 'Message', 10);

  echo $contact->send();
?>
