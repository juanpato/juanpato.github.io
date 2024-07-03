document.addEventListener("DOMContentLoaded", async function() {
    const form = document.getElementById("expense-form");
    const expenseList = document.getElementById("expense-list");
    const paymentSummary = document.getElementById("payment-summary");
    const copySummaryBtn = document.getElementById("copy-summary");
    const selectAllCheckbox = document.getElementById("select-all");

    let gastos = [];
    let editIndex = -1;
    let participants = [];
    let cbus = {};

    const apiEndpoint = "https://nizp0d1uh2.execute-api.sa-east-1.amazonaws.com/develop/usuarios";

    // Fetch participants and CBUs from the API
    try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
            throw new Error('Error al obtener los usuarios');
        }
        const usuarios = await response.json();
        console.log(usuarios)
        participants = usuarios.map(usuario => usuario.name);
        usuarios.forEach(usuario => {
            cbus[usuario.name] = usuario.cbu;
        });
    } catch (error) {
        console.error('Error:', error);
    }

    form.addEventListener("submit", function(event) {
        event.preventDefault();
        const title = document.getElementById("title").value;
        const amount = parseFloat(document.getElementById("amount").value);
        const payer = document.getElementById("payer").value;
        const selectedParticipants = Array.from(document.getElementById("participants").selectedOptions).map(option => option.value);

        if (selectedParticipants.length === 0) {
            alert("Por favor, seleccione al menos un participante.");
            return;
        }

        const gasto = { title, amount, payer, participants: selectedParticipants };

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

    copySummaryBtn.addEventListener("click", function() {
        const summaryText = paymentSummary.innerText;
        
        // Crear un elemento de texto temporal
        const textArea = document.createElement("textarea");
        textArea.value = summaryText;
        textArea.style.position = "fixed"; // Evitar desplazamiento de la página
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        // Intentar usar el comando de copia
        try {
            document.execCommand('copy');
            alert("Resumen copiado al portapapeles.");
        } catch (err) {
            alert("Error al copiar el resumen: " + err);
        }

        // Eliminar el elemento temporal
        document.body.removeChild(textArea);
    });

    selectAllCheckbox.addEventListener("change", function() {
        const participantsSelect = document.getElementById("participants");
        const selectAll = selectAllCheckbox.checked;
        Array.from(participantsSelect.options).forEach(option => option.selected = selectAll);
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
        const participantsSelect = document.getElementById("participants");
        Array.from(participantsSelect.options).forEach(option => {
            option.selected = gasto.participants.includes(option.value);
        });
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

            // Agregar CBU si está definido en cbus
            const cbuInfo = cbus[acreedor.nombre] ? `(CBU/Alias: ${cbus[acreedor.nombre]})` : "";

            pagos.push(`${deuda.nombre} le debe a ${acreedor.nombre}: ${pago.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} ${cbuInfo}`);

            deuda.cantidad -= pago;
            acreedor.cantidad -= pago;

            if (deuda.cantidad === 0) deudas.shift();
            if (acreedor.cantidad === 0) acreedores.shift();
        }

        paymentSummary.innerHTML = pagos.map(pago => `<li>${pago}</li>`).join("");
    }

    function cargarSelects() {
        const payerSelect = document.getElementById("payer");
        const participantsSelect = document.getElementById("participants");
        const participantSelect = document.getElementById("participant");

        [payerSelect, participantsSelect, participantSelect].forEach(select => {
            select.innerHTML = "";
            participants.forEach(participant => {
                const option = document.createElement("option");
                option.value = participant;
                option.textContent = participant;
                select.appendChild(option);
            });
        });

        if (participantsSelect) {
            participantsSelect.multiple = true;
        }
    }

    cargarSelects();
});
