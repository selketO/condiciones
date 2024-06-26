<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Facturas</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" rel="stylesheet">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 20px;
    }
    .filter-group {
      background-color: #fff;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .filter-group > div {
      margin-bottom: 10px;
    }
    label {
      font-weight: bold;
      margin-right: 10px;
    }
    input[type="text"], input[type="date"], select {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    select.custom-select {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      padding-right: 30px;
      background: url('https://cdn-icons-png.flaticon.com/512/60/60995.png') no-repeat right 10px center;
      background-size: 20px;
      cursor: pointer;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background-color: #fff;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      color: #333;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    #totalResults {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>Reporte de Descuentos</h1>
  
  <div id="totalAmounts">
    <p>Total Fee for Service: <span id="totalFeeForService">0.00</span></p>
    <p>Total Recuperación del Costo: <span id="totalRecuperacionCosto">0.00</span></p>
    <p>Total Fee Logístico: <span id="totalFeeLogistico">0.00</span></p>
    <p>Total Publicidad: <span id="totalPublicidad">0.00</span></p>
    <p>Total Factoraje: <span id="totalFactoraje">0.00</span></p>
    <p>Total Pronto Pago: <span id="totalProntoPago">0.00</span></p>
  </div>
  
  <div class="filter-group">
    <div>
      <label for="searchInput"><i class="fas fa-search"></i> Buscar:</label>
      <input type="text" id="searchInput" onkeyup="filterFunction()" placeholder="Buscar por nombre...">
    </div>
    <div>
      <label for="clientFilter"><i class="fas fa-users"></i> Cliente:</label>
      <select id="clientFilter" class="custom-select" onchange="filterFunction()">
        <option value="">Todos los clientes</option>
        <% 
          let uniqueClients = [];
          records.forEach(record => {
            if (!uniqueClients.includes(record.partner_id)) {
              uniqueClients.push(record.partner_id);
            }
          });
          uniqueClients.sort().forEach(client => { 
        %>
          <option value="<%= client %>"><%= client %></option>
        <% }); %>
      </select>
    </div>
    <div>
      <label for="startDate"><i class="fas fa-calendar-alt"></i> Fecha Inicio:</label>
      <input type="date" id="startDate" onchange="filterFunction()" placeholder="Fecha inicio...">
    </div>
    <div>
      <label for="endDate"><i class="fas fa-calendar-alt"></i> Fecha Fin:</label>
      <input type="date" id="endDate" onchange="filterFunction()" placeholder="Fecha fin...">
    </div>
  </div>
  
  <table id="recordsTable">
    <thead>
      <tr>
        <th>Factura</th>
        <th>Cliente</th>
        <th style="display: none;">SKU</th>
        <th>Nombre</th>
        <th>Subtotal</th>
        <th>Fee for Service</th>
        <th>Recuperación del Costo</th>
        <th>Fee Logístico</th>
        <th>Publicidad</th>
        <th>Factoraje</th>
        <th>Pronto Pago</th>
      </tr>
    </thead>
    <tbody>
      <% records.forEach(record => { %>
        <tr>
            <td><%= record.move_id %></td>
            <td><%= record.partner_id %></td>
            <td style="display: none;"><%= record.SKU %></td>
            <td><%= record.name %></td>
            <td><%= record.price_subtotal.toFixed(2) %></td>
            <td><%= record.feeForServiceAmount ? record.feeForServiceAmount.toFixed(2) : '0.00' %></td>
            <td><%= record.recuperacionCostoAmount ? record.recuperacionCostoAmount.toFixed(2) : '0.00' %></td>
            <td><%= record.feeLogisticoAmount ? record.feeLogisticoAmount.toFixed(2) : '0.00' %></td>
            <td><%= record.publicidadAmount ? record.publicidadAmount.toFixed(2) : '0.00' %></td>
            <td><%= record.factorajeAmount ? record.factorajeAmount.toFixed(2) : '0.00' %></td>
            <td><%= record.prontoPagoAmount ? record.prontoPagoAmount.toFixed(2) : '0.00' %></td>
    
          <td style="display: none;"><%= record.fecha %></td> 
        </tr>
      <% }) %>
    </tbody>
  </table>

  <script>
    function updateTotalAmounts() {
      var totalFeeForService = 0;
      var totalRecuperacionCosto = 0;
      var totalFeeLogistico = 0;
      var totalPublicidad = 0;
      var totalFactoraje = 0;
      var totalProntoPago = 0;

      var table = document.getElementById("recordsTable");
      var rows = table.getElementsByTagName("tr");
      
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var cells = row.getElementsByTagName("td");
        
        totalFeeForService += parseFloat(cells[5].textContent);
        totalRecuperacionCosto += parseFloat(cells[6].textContent);
        totalFeeLogistico += parseFloat(cells[7].textContent);
        totalPublicidad += parseFloat(cells[8].textContent);
        totalFactoraje += parseFloat(cells[9].textContent);
        totalProntoPago += parseFloat(cells[10].textContent);
      }

      document.getElementById("totalFeeForService").textContent = totalFeeForService.toFixed(2);
      document.getElementById("totalRecuperacionCosto").textContent = totalRecuperacionCosto.toFixed(2);
      document.getElementById("totalFeeLogistico").textContent = totalFeeLogistico.toFixed(2);
      document.getElementById("totalPublicidad").textContent = totalPublicidad.toFixed(2);
      document.getElementById("totalFactoraje").textContent = totalFactoraje.toFixed(2);
      document.getElementById("totalProntoPago").textContent = totalProntoPago.toFixed(2);
    }
    document.addEventListener('DOMContentLoaded', function () {
      updateTotalAmounts();
    });

    function filterFunction() {
      var inputSearch, inputClient, startDate, endDate, filterSearch, filterClient, filterStartDate, filterEndDate, table, tr, td, i;
      inputSearch = document.getElementById("searchInput");
      inputClient = document.getElementById("clientFilter");
      startDate = document.getElementById("startDate");
      endDate = document.getElementById("endDate");
      filterSearch = inputSearch.value.toUpperCase();
      filterClient = inputClient.value.toUpperCase();
      filterStartDate = startDate.value;
      filterEndDate = endDate.value;
      table = document.getElementById("recordsTable");
      tr = table.getElementsByTagName("tr");
  
      for (i = 1; i < tr.length; i++) {
        td = tr[i].getElementsByTagName("td");
        var txtValueName = td[3].textContent || td[3].innerText;
        var txtValueClient = td[1].textContent || td[1].innerText;
        var txtValueDate = td[td.length - 1].textContent || td[td.length - 1].innerText;
  
        var rowDate = new Date(txtValueDate);
        var start = new Date(filterStartDate);
        var end = new Date(filterEndDate);
  
        if (txtValueName.toUpperCase().indexOf(filterSearch) > -1 && 
            txtValueClient.toUpperCase().indexOf(filterClient) > -1 &&
            (!filterStartDate || rowDate >= start) &&
            (!filterEndDate || rowDate <= end)) {
          tr[i].style.display = "";
        } else {
          tr[i].style.display = "none";
        }
      }
      updateTotalAmounts();
    }
  </script>
</body>
</html>
