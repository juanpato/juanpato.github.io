document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("expense-form");
    const cbuForm = document.getElementById("cbu-form");
    const expenseList = document.getElementById("expense-list");
    const paymentSummary = document.getElementById("payment-summary");
    const copySummaryBtn = document.getElementById("copy-summary");

    let gastos = [];
    let cbus = {};
    let editIndex = -1;

    form.addEventListener("submit", function(event) {
        event.preventDefault();
        const title = document.getElementById("title").value;
        const amount = parseFloat(document.getElementById("amount").value);
        const payer = document.getElementById("payer").value;
        const participants = Array.from(document.getElementById("participants").selectedOptions).map(option => option.value);

        if (participants.length === 0) {
            alert("Por favor, seleccione al menos un participante.");
            return;
        }

        const gasto = { title, amount, payer, participants };

        if (editIndex === -1) {
            gastos.push(gasto);
        } else {
            gastos[editIndex] = gasto;
            editIndex = -1;
            form.querySelector('button[type="submit"]').textContent = 'Agregar Gasto';
        }

        actualizarListaGastos();
        calcularPagos();
        form.reset();
    });

    cbuForm.addEventListener("submit", function(event) {
        event.preventDefault();
        const participant = document.getElementById("participant").value;
        const cbu = document.getElementById("cbu").value;

        cbus[participant] = cbu;

        alert(`CBU/Alias de ${participant} ha sido agregado.`);
        cbuForm.reset();
    });

    copySummaryBtn.addEventListener("click", function() {
        const summaryText = paymentSummary.innerText;
        navigator.clipboard.writeText(summaryText)
            .then(() => alert("Resumen copiado al portapapeles."))
            .catch(err => alert("Error al copiar el resumen: ", err));
    });

    function actualizarListaGastos() {
        expenseList.innerHTML = "";
        gastos.forEach((gasto, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${gasto.title}</td>
                <td>${gasto.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</td>
                <td>${gasto.payer}</td>
                <td>${gasto.participants.join(", ")}</td>
                <td>
                    <button class="btn btn-warning btn-sm mr-2" onclick="editarGasto(${index})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarGasto(${index})">Eliminar</button>
                </td>
            `;
            expenseList.appendChild(row);
        });
    }

    window.editarGasto = function(index) {
        const gasto = gastos[index];
        document.getElementById("title").value = gasto.title;
        document.getElementById("amount").value = gasto.amount;
        document.getElementById("payer").value = gasto.payer;
        document.getElementById("participants").value = gasto.participants;
        editIndex = index;
        form.querySelector('button[type="submit"]').textContent = 'Guardar Cambios';
    };

    window.eliminarGasto = function(index) {
        gastos.splice(index, 1);
        actualizarListaGastos();
        calcularPagos();
    };

    function calcularPagos() {
        const balances = {};

        // Inicializar balances
        const allParticipants = new Set();
        gastos.forEach(gasto => gasto.participants.forEach(p => allParticipants.add(p)));
        allParticipants.forEach(participant => balances[participant] = 0);

        // Calcular gastos y balances
        gastos.forEach(gasto => {
            const gastoPorPersona = gasto.amount / gasto.participants.length;
            gasto.participants.forEach(participant => balances[participant] -= gastoPorPersona);
            balances[gasto.payer] += gasto.amount;
        });

        const deudas = [];
        const acreedores = [];

        // Clasificar deudas y acreedores
        for (let [participant, balance] of Object.entries(balances)) {
            if (balance < 0) deudas.push({ nombre: participant, cantidad: -balance });
            else if (balance > 0) acreedores.push({ nombre: participant, cantidad: balance });
        }

        const pagos = [];
        while (deudas.length && acreedores.length) {
            const deuda = deudas[0];
            const acreedor = acreedores[0];

            const pago = Math.min(deuda.cantidad, acreedor.cantidad);

            pagos.push(`${deuda.nombre} le debe a ${acreedor.nombre}: ${pago.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} ${cbus[acreedor.nombre] ? `(CBU/Alias: ${cbus[acreedor.nombre]})` : ""}`);

            deuda.cantidad -= pago;
            acreedor.cantidad -= pago;

            if (deuda.cantidad === 0) deudas.shift();
            if (acreedor.cantidad === 0) acreedores.shift();
        }

        paymentSummary.innerHTML = pagos.map(pago => `<li>${pago}</li>`).join("");
    }
});
