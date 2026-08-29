<?php
// Çay Vadisi — Mini-Cloud-Save für nesbun.de (Mittwald-Hosting, PHP >= 7.4).
// Spielstände werden unter saves/<sha256(code)>.json abgelegt. Der Code ist
// das Geheimnis des Spielers (min. 6 Zeichen) — kein Konto, keine Cookies.
// Die Datei einfach mit ins Webroot hochladen; der Ordner saves/ wird
// automatisch angelegt.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$dir = __DIR__ . '/saves';
if (!is_dir($dir)) { @mkdir($dir, 0755); @file_put_contents($dir . '/.htaccess', "Deny from all\n"); }

function fail($msg, $code = 400) {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg]);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $body = json_decode(file_get_contents('php://input'), true);
  if (!$body || !isset($body['code']) || !isset($body['data'])) fail('code und data nötig');
  $code = trim($body['code']);
  if (strlen($code) < 6) fail('Code zu kurz (min. 6 Zeichen)');
  $data = $body['data'];
  if (!is_array($data)) fail('data muss der Spielstand (JSON-Objekt) sein');
  $json = json_encode($data, JSON_UNESCAPED_UNICODE);
  if (strlen($json) > 300000) fail('Spielstand zu groß');
  $file = $dir . '/' . hash('sha256', $code) . '.json';
  if (file_put_contents($file, $json, LOCK_EX) === false) fail('Konnte nicht speichern', 500);
  echo json_encode(['ok' => true, 'bytes' => strlen($json), 'time' => date('c')]);
  exit;
}

if ($method === 'GET') {
  $code = isset($_GET['code']) ? trim($_GET['code']) : '';
  if (strlen($code) < 6) fail('Code zu kurz (min. 6 Zeichen)');
  $file = $dir . '/' . hash('sha256', $code) . '.json';
  if (!is_file($file)) fail('Kein Cloud-Spielstand für diesen Code', 404);
  echo json_encode(['ok' => true, 'data' => json_decode(file_get_contents($file), true)]);
  exit;
}

fail('Nur GET/POST', 405);
