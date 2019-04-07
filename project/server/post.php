<?php


header('Content-type: application/json');
header('Access-Control-Allow-Origin: *');
sleep(2);
echo json_encode(array('status' => 'OK'));

?>